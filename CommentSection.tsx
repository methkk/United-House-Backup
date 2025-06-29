import React from 'react';
import { MessageSquare, ArrowBigUp, ArrowBigDown, Trash2, Edit2, Reply, X, Filter, MapPin, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  score: number;
  parent_id: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    postcode: string | null;
    official: boolean;
  };
  comment_votes: {
    value: number;
  }[];
}

interface CommentSectionProps {
  postId: string;
  isProject?: boolean;
}

export function CommentSection({ postId, isProject = false }: CommentSectionProps) {
  const navigate = useNavigate();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [filteredComments, setFilteredComments] = React.useState<Comment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [newComment, setNewComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [replyTo, setReplyTo] = React.useState<string | null>(null);
  const [editingComment, setEditingComment] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [currentUser, setCurrentUser] = React.useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = React.useState<{ official: boolean } | null>(null);
  const [entityExists, setEntityExists] = React.useState(true);
  const [showPostcodeFilter, setShowPostcodeFilter] = React.useState(false);
  const [postcodeFilter, setPostcodeFilter] = React.useState('');
  const [availablePostcodes, setAvailablePostcodes] = React.useState<string[]>([]);
  const [isPostAuthor, setIsPostAuthor] = React.useState(false);

  React.useEffect(() => {
    if (!postId) {
      setError('Invalid post ID');
      return;
    }
    checkEntityExists();
    checkCurrentUser();
  }, [postId]);

  React.useEffect(() => {
    if (comments.length > 0) {
      applyPostcodeFilter();
      extractAvailablePostcodes();
    }
  }, [comments, postcodeFilter]);

  const checkCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setCurrentUser(session.user.id);
      
      // Fetch user profile to check if they're official
      const { data: profile } = await supabase
        .from('profiles')
        .select('official')
        .eq('id', session.user.id)
        .single();
      
      setCurrentUserProfile(profile);

      // Check if user is the author of the post/project
      const { data: entity } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      setIsPostAuthor(entity?.user_id === session.user.id);
    }
  };

  const checkEntityExists = async () => {
    try {
      const { data, error } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .select('id')
        .eq('id', postId)
        .single();

      if (error || !data) {
        setEntityExists(false);
        setError(`The ${isProject ? 'project' : 'post'} you're trying to view is no longer available.`);
        return false;
      }

      setEntityExists(true);
      await fetchComments();
      return true;
    } catch (err) {
      console.error('Error checking entity:', err);
      setEntityExists(false);
      setError(`Failed to verify ${isProject ? 'project' : 'post'} existence`);
      return false;
    }
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(isProject ? 'project_comments' : 'post_comments')
        .select(`
          *,
          profiles(username, avatar_url, postcode, official),
          ${isProject ? 'project_comment_votes' : 'comment_votes'}(value)
        `)
        .eq(isProject ? 'project_id' : 'post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(`Failed to load comments: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const extractAvailablePostcodes = () => {
    const postcodes = comments
      .map(comment => comment.profiles?.postcode)
      .filter((postcode): postcode is string => Boolean(postcode))
      .filter((postcode, index, array) => array.indexOf(postcode) === index)
      .sort();
    
    setAvailablePostcodes(postcodes);
  };

  const applyPostcodeFilter = () => {
    if (!postcodeFilter) {
      setFilteredComments(comments);
      return;
    }

    const filtered = comments.filter(comment => {
      const commentPostcode = comment.profiles?.postcode;
      if (!commentPostcode) return false;
      
      // Support partial matching (e.g., "SW1" matches "SW1A 1AA")
      return commentPostcode.toLowerCase().includes(postcodeFilter.toLowerCase());
    });

    setFilteredComments(filtered);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId) return;

    try {
      setSubmitting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to comment');
        return;
      }

      // Check if the entity still exists before submitting the comment
      const exists = await checkEntityExists();
      if (!exists) {
        alert(`The ${isProject ? 'project' : 'post'} you're trying to comment on is no longer available.`);
        return;
      }

      const commentData = {
        content: newComment.trim(),
        user_id: session.user.id,
        parent_id: replyTo,
        [isProject ? 'project_id' : 'post_id']: postId
      };

      const { error: insertError } = await supabase
        .from(isProject ? 'project_comments' : 'post_comments')
        .insert([commentData]);

      if (insertError) {
        if (insertError.code === '23503') { // Foreign key violation
          setEntityExists(false);
          setError(`The ${isProject ? 'project' : 'post'} you're trying to comment on is no longer available.`);
          return;
        }
        throw insertError;
      }

      setNewComment('');
      setReplyTo(null);
      await fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      alert(`Failed to post comment: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (commentId: string, value: number) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to vote');
        return;
      }

      const comment = comments.find(c => c.id === commentId);
      const currentVote = comment?.comment_votes?.[0]?.value;
      const newValue = currentVote === value ? 0 : value;

      if (newValue === 0) {
        await supabase
          .from(isProject ? 'project_comment_votes' : 'comment_votes')
          .delete()
          .match({ comment_id: commentId, user_id: session.user.id });
      } else {
        await supabase
          .from(isProject ? 'project_comment_votes' : 'comment_votes')
          .upsert({
            comment_id: commentId,
            user_id: session.user.id,
            value: newValue
          }, {
            onConflict: 'user_id,comment_id'
          });
      }

      await fetchComments();
    } catch (err) {
      console.error('Error voting:', err);
      alert('Failed to vote');
    }
  };

  const handleEditComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from(isProject ? 'project_comments' : 'post_comments')
        .update({ content: editContent })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      await fetchComments();
    } catch (err) {
      console.error('Error editing comment:', err);
      alert('Failed to edit comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from(isProject ? 'project_comments' : 'post_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment');
    }
  };

  const handleUsernameClick = (username: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/user/${username}`);
  };

  const renderPostcodeFilter = () => {
    // Only show filter if user is official and is the post author, or if there are comments with postcodes
    if (!currentUserProfile?.official || !isPostAuthor || availablePostcodes.length === 0) {
      return null;
    }

    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Filter Comments by Postcode</h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              Official Feature
            </span>
          </div>
          <button
            onClick={() => setShowPostcodeFilter(!showPostcodeFilter)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ChevronDown className={clsx("w-5 h-5 transition-transform", showPostcodeFilter && "rotate-180")} />
          </button>
        </div>

        {showPostcodeFilter && (
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Enter postcode (e.g., SW1, M1, etc.)"
                  value={postcodeFilter}
                  onChange={(e) => setPostcodeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => setPostcodeFilter('')}
                className="px-3 py-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-blue-700 font-medium">Quick filters:</span>
              {availablePostcodes.slice(0, 8).map((postcode) => (
                <button
                  key={postcode}
                  onClick={() => setPostcodeFilter(postcode)}
                  className={clsx(
                    "px-2 py-1 text-xs rounded-full border transition-colors",
                    postcodeFilter === postcode
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-blue-600 border-blue-300 hover:bg-blue-100"
                  )}
                >
                  {postcode}
                </button>
              ))}
              {availablePostcodes.length > 8 && (
                <span className="text-xs text-blue-600">
                  +{availablePostcodes.length - 8} more
                </span>
              )}
            </div>

            {postcodeFilter && (
              <div className="flex items-center space-x-2 text-sm text-blue-700">
                <MapPin className="w-4 h-4" />
                <span>
                  Showing {filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''} 
                  {postcodeFilter && ` from "${postcodeFilter}"`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCommentForm = (parentId: string | null = null) => (
    <form onSubmit={handleSubmitComment} className="space-y-4">
      <div className="relative">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
          required
          disabled={!entityExists}
        />
        {parentId && (
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !entityExists}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Posting...' : parentId ? 'Reply' : 'Comment'}
        </button>
      </div>
    </form>
  );

  const renderComment = (comment: Comment, level: number = 0) => {
    const isEditing = editingComment === comment.id;
    const isAuthor = currentUser === comment.user_id;
    const userVote = comment.comment_votes?.[0]?.value;
    const replies = (postcodeFilter ? filteredComments : comments).filter(c => c.parent_id === comment.id);

    return (
      <div key={comment.id} className={clsx("border-l-2 pl-4", level === 0 && "border-transparent")}>
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-start space-x-4">
            {comment.profiles.avatar_url ? (
              <img
                src={comment.profiles.avatar_url}
                alt={comment.profiles.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {comment.profiles.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <button
                  onClick={(e) => handleUsernameClick(comment.profiles.username, e)}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  @{comment.profiles.username}
                </button>
                {comment.profiles.official && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Official
                  </span>
                )}
                {comment.profiles.postcode && currentUserProfile?.official && isPostAuthor && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    <span>{comment.profiles.postcode}</span>
                  </div>
                )}
                <span className="text-gray-500">•</span>
                <span className="text-gray-500 text-sm">
                  {formatDistanceToNow(new Date(comment.created_at))} ago
                </span>
                {comment.updated_at !== comment.created_at && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-500 text-sm italic">edited</span>
                  </>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingComment(null)}
                      className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditComment(comment.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700">{comment.content}</p>
              )}

              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleVote(comment.id, 1)}
                    className={clsx(
                      "p-1 rounded hover:bg-gray-100 transition-colors",
                      userVote === 1 && "text-orange-500"
                    )}
                  >
                    <ArrowBigUp className="w-4 h-4" />
                  </button>
                  <span className={clsx(
                    "text-sm font-medium",
                    userVote === 1 && "text-orange-500",
                    userVote === -1 && "text-blue-500"
                  )}>
                    {comment.score}
                  </span>
                  <button
                    onClick={() => handleVote(comment.id, -1)}
                    className={clsx(
                      "p-1 rounded hover:bg-gray-100 transition-colors",
                      userVote === -1 && "text-blue-500"
                    )}
                  >
                    <ArrowBigDown className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="flex items-center text-gray-500 hover:text-gray-700"
                  disabled={!entityExists}
                >
                  <Reply className="w-4 h-4 mr-1" />
                  <span className="text-sm">Reply</span>
                </button>

                {isAuthor && (
                  <>
                    <button
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditContent(comment.content);
                      }}
                      className="flex items-center text-gray-500 hover:text-gray-700"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      <span className="text-sm">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="flex items-center text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </>
                )}
              </div>

              {replyTo === comment.id && (
                <div className="mt-4">
                  {renderCommentForm(comment.id)}
                </div>
              )}
            </div>
          </div>
        </div>

        {replies.length > 0 && (
          <div className="mt-4 space-y-4 border-l-2 border-gray-100">
            {replies.map(reply => renderComment(reply, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  const commentsToShow = postcodeFilter ? filteredComments : comments;
  const rootComments = commentsToShow.filter(comment => !comment.parent_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-lg font-semibold">
        <MessageSquare className="w-5 h-5" />
        <h2>Comments</h2>
        {postcodeFilter && (
          <span className="text-sm font-normal text-blue-600">
            (Filtered by {postcodeFilter})
          </span>
        )}
      </div>

      {renderPostcodeFilter()}

      <div className="mb-6">
        {renderCommentForm()}
      </div>

      <div className="space-y-4">
        {rootComments.map(comment => renderComment(comment))}
        {rootComments.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            {postcodeFilter 
              ? `No comments found from "${postcodeFilter}". Try a different postcode or clear the filter.`
              : 'No comments yet. Be the first to comment!'
            }
          </p>
        )}
      </div>
    </div>
  );
}