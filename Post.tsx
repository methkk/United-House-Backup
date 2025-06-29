import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Users, Link as LinkIcon, Trash2, Lightbulb, BadgeCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { ImageModal } from './ImageModal';
import { CommentSection } from './CommentSection';
import clsx from 'clsx';

interface Supporter {
  id: string;
  status: string;
  rejection_reason?: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface PostProps {
  id: string;
  title: string;
  content?: string;
  problem?: string;
  solution?: string;
  score: number;
  created_at: string;
  author: string;
  commentCount: number;
  userVote?: number;
  community?: {
    id: string;
    name: string;
  };
  media_type?: string | null;
  media_url?: string | null;
  isProject?: boolean;
  onDelete?: () => void;
  showComments?: boolean;
}

export function Post({
  id,
  title,
  content,
  problem,
  solution,
  score,
  created_at,
  author,
  commentCount: initialCommentCount,
  userVote,
  community,
  media_type,
  media_url,
  isProject = false,
  onDelete,
  showComments = false
}: PostProps) {
  const navigate = useNavigate();
  const [currentVote, setCurrentVote] = React.useState(userVote);
  const [currentScore, setCurrentScore] = React.useState(score);
  const [upvotes, setUpvotes] = React.useState(0);
  const [downvotes, setDownvotes] = React.useState(0);
  const [isVoting, setIsVoting] = React.useState(false);
  const [showImageModal, setShowImageModal] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isCurrentUser, setIsCurrentUser] = React.useState(false);
  const [isPostDeleted, setIsPostDeleted] = React.useState(false);
  const [supporters, setSupporters] = React.useState<Supporter[]>([]);
  const [isCommentsVisible, setIsCommentsVisible] = React.useState(showComments);
  const [currentCommentCount, setCurrentCommentCount] = React.useState(initialCommentCount);
  const [username, setUsername] = React.useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const postRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const fetchUsername = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', author)
        .maybeSingle();

      if (!error && data) {
        setUsername(data.username);
      }
    };

    fetchUsername();
    checkCurrentUser();
    fetchVoteCounts();
    if (isProject) {
      fetchSupporters();
    }
  }, [author, isProject, id]);

  React.useEffect(() => {
    const fetchCommentCount = async () => {
      const { count, error } = await supabase
        .from(isProject ? 'project_comments' : 'post_comments')
        .select('id', { count: 'exact', head: true })
        .eq(isProject ? 'project_id' : 'post_id', id);

      if (!error && count !== null) {
        setCurrentCommentCount(count);
      }
    };

    fetchCommentCount();
  }, [id, isProject]);

  const fetchVoteCounts = async () => {
    try {
      const { data, error } = await supabase
        .from(isProject ? 'project_votes' : 'votes')
        .select('value')
        .eq(isProject ? 'project_id' : 'post_id', id);

      if (error) throw error;

      const votes = data || [];
      const upvoteCount = votes.filter(vote => vote.value === 1).length;
      const downvoteCount = votes.filter(vote => vote.value === -1).length;
      
      setUpvotes(upvoteCount);
      setDownvotes(downvoteCount);
      setCurrentScore(upvoteCount - downvoteCount);
    } catch (err) {
      console.error('Error fetching vote counts:', err);
    }
  };

  const fetchSupporters = async () => {
    try {
      const { data, error } = await supabase
        .from('project_supporters')
        .select(`
          id,
          status,
          rejection_reason,
          profiles:supporter_id (
            username,
            avatar_url
          )
        `)
        .eq('project_id', id);

      if (error) throw error;
      setSupporters(data || []);
    } catch (err) {
      console.error('Error fetching supporters:', err);
    }
  };

  const checkCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsAuthenticated(!!session?.user);
    setIsCurrentUser(session?.user?.id === author);
  };

  const handleVote = async (value: number) => {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to vote on posts');
        navigate('/login');
        return;
      }

      if (isVoting) return;
      setIsVoting(true);

      const { data: postExists, error: postCheckError } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (postCheckError || !postExists) {
        setIsPostDeleted(true);
        throw new Error('This post no longer exists');
      }

      const newValue = currentVote === value ? 0 : value;
      
      // Update local state optimistically
      let newUpvotes = upvotes;
      let newDownvotes = downvotes;
      
      // Remove previous vote if any
      if (currentVote === 1) {
        newUpvotes--;
      } else if (currentVote === -1) {
        newDownvotes--;
      }
      
      // Add new vote if any
      if (newValue === 1) {
        newUpvotes++;
      } else if (newValue === -1) {
        newDownvotes++;
      }
      
      setCurrentVote(newValue);
      setUpvotes(newUpvotes);
      setDownvotes(newDownvotes);
      setCurrentScore(newUpvotes - newDownvotes);

      if (newValue === 0) {
        const { error } = await supabase
          .from(isProject ? 'project_votes' : 'votes')
          .delete()
          .match({ 
            [isProject ? 'project_id' : 'post_id']: id, 
            user_id: session.user.id 
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(isProject ? 'project_votes' : 'votes')
          .upsert({
            [isProject ? 'project_id' : 'post_id']: id,
            user_id: session.user.id,
            value: newValue
          }, {
            onConflict: 'user_id,' + (isProject ? 'project_id' : 'post_id')
          });

        if (error) throw error;
      }

      // Update the score in the database
      const { error: updateError } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .update({ score: newUpvotes - newDownvotes })
        .eq('id', id);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error voting:', error);
      // Revert optimistic updates on error
      await fetchVoteCounts();
      setCurrentVote(userVote);
      
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Failed to vote. Please try again later.');
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this ${isProject ? 'project' : 'post'}?`)) {
      return;
    }

    try {
      setIsDeleting(true);

      // First check if the post/project still exists
      const { data: exists, error: checkError } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // Record not found
          setIsPostDeleted(true);
          if (onDelete) onDelete();
          return;
        }
        throw checkError;
      }

      if (!exists) {
        setIsPostDeleted(true);
        if (onDelete) onDelete();
        return;
      }

      // Proceed with deletion
      const { error: deleteError } = await supabase
        .from(isProject ? 'projects' : 'posts')
        .delete()
        .eq('id', id);

      if (deleteError) {
        if (deleteError.code === '42501') {
          throw new Error(`You don't have permission to delete this ${isProject ? 'project' : 'post'}`);
        }
        throw deleteError;
      }

      setIsPostDeleted(true);
      
      if (onDelete) {
        onDelete();
      }

      // Navigate away if we're on the detail page
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/${isProject ? 'project' : 'post'}/${id}`)) {
        navigate(community ? `/r/${community.name}` : '/');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      alert(err instanceof Error ? err.message : `Failed to delete ${isProject ? 'project' : 'post'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowImageModal(true);
  };

  const handleContentClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.media-container')) {
      e.preventDefault();
      return;
    }
    
    // Check if we're on the homepage or community page
    const currentPath = window.location.pathname;
    const isHomePage = currentPath === '/';
    const isCommunityPage = currentPath.startsWith('/r/') && !currentPath.includes('/post/') && !currentPath.includes('/project/');
    
    // Only navigate if we're on homepage or community page (not already on a specific post/project page)
    if (isHomePage || isCommunityPage) {
      if (community) {
        const entityType = isProject ? 'project' : 'post';
        
        // Store scroll position if on homepage
        if (isHomePage && postRef.current) {
          const scrollPosition = window.pageYOffset || window.scrollY;
          const postPosition = postRef.current.offsetTop;
          
          // Store both positions
          sessionStorage.setItem('homepage-scroll-position', scrollPosition.toString());
          sessionStorage.setItem(`${entityType}-${id}-position`, postPosition.toString());
          
          console.log('Storing positions:', {
            scrollPosition,
            postPosition,
            entityType,
            id
          });
        }
        
        // Pass state to indicate if coming from homepage
        navigate(`/r/${community.name.toLowerCase()}/${entityType}/${id}`, {
          state: { fromHomepage: isHomePage }
        });
      }
    }
  };

  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsCommentsVisible(!isCommentsVisible);
  };

  const handleUsernameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (username) {
      navigate(`/user/${username}`);
    }
  };

  const renderMedia = () => {
    if (!media_type || !media_url) return null;

    switch (media_type) {
      case 'photo':
        return (
          <div className="media-container cursor-pointer transition-transform hover:scale-[1.02]" onClick={handleImageClick}>
            <img
              src={media_url}
              alt={title}
              className="mt-4 max-h-96 w-full rounded-lg object-cover sm:object-contain"
              loading="lazy"
            />
          </div>
        );
      case 'video':
        return (
          <video
            src={media_url}
            controls
            className="mt-4 max-h-96 w-full rounded-lg"
          />
        );
      case 'gif':
        return (
          <div className="media-container cursor-pointer transition-transform hover:scale-[1.02]" onClick={handleImageClick}>
            <img
              src={media_url}
              alt={title}
              className="mt-4 max-h-96 w-full rounded-lg object-cover sm:object-contain"
              loading="lazy"
            />
          </div>
        );
      case 'link':
        return (
          <a
            href={media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center text-blue-600 hover:text-blue-800 break-all"
          >
            <LinkIcon className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="line-clamp-1">{media_url}</span>
          </a>
        );
      default:
        return null;
    }
  };

  const renderSupporters = () => {
    if (!isProject || supporters.length === 0) return null;

    return (
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Project Supporters:</h4>
        <div className="flex flex-wrap gap-2">
          {supporters.map((supporter) => (
            <div
              key={supporter.id}
              className={clsx(
                "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm",
                supporter.status === 'pending' && "bg-yellow-50 text-yellow-700",
                supporter.status === 'accepted' && "bg-green-50 text-green-700",
                supporter.status === 'rejected' && "bg-red-50 text-red-700"
              )}
            >
              {supporter.profiles.avatar_url ? (
                <img
                  src={supporter.profiles.avatar_url}
                  alt={supporter.profiles.username}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium">
                    {supporter.profiles.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-medium">@{supporter.profiles.username}</span>
              <BadgeCheck className="w-4 h-4" />
              {supporter.status === 'pending' && (
                <span className="text-xs">(Pending)</span>
              )}
              {supporter.status === 'rejected' && supporter.rejection_reason && (
                <span
                  className="cursor-help"
                  title={`Rejection reason: ${supporter.rejection_reason}`}
                >
                  (Rejected)
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isPostDeleted) {
    return null;
  }

  return (
    <>
      <div ref={postRef} id={`post-${id}`} className="bg-white rounded-lg shadow p-3 sm:p-6 mb-4">
        <div className="flex flex-col sm:flex-row">
          <div className="flex sm:flex-col items-center sm:items-center mb-4 sm:mb-0 sm:mr-4">
            {/* Upvote count */}
            <div className={clsx(
              'text-sm font-medium transition-all mb-1',
              currentVote === 1 && 'text-orange-500'
            )}>
              {upvotes}
            </div>
            
            {/* Upvote button */}
            <button
              onClick={() => handleVote(1)}
              disabled={isVoting}
              className={clsx(
                'p-1 rounded hover:bg-gray-100 transition-colors mb-2',
                currentVote === 1 && 'text-orange-500 bg-orange-50',
                isVoting && 'opacity-50 cursor-not-allowed',
                !isAuthenticated && 'hover:bg-blue-50'
              )}
              aria-label="Upvote"
              title={!isAuthenticated ? "Sign in to vote" : "Upvote"}
            >
              <ArrowBigUp className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Downvote button */}
            <button
              onClick={() => handleVote(-1)}
              disabled={isVoting}
              className={clsx(
                'p-1 rounded hover:bg-gray-100 transition-colors mb-1',
                currentVote === -1 && 'text-blue-500 bg-blue-50',
                isVoting && 'opacity-50 cursor-not-allowed',
                !isAuthenticated && 'hover:bg-blue-50'
              )}
              aria-label="Downvote"
              title={!isAuthenticated ? "Sign in to vote" : "Downvote"}
            >
              <ArrowBigDown className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Downvote count */}
            <div className={clsx(
              'text-sm font-medium transition-all',
              currentVote === -1 && 'text-blue-500'
            )}>
              {downvotes}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            {community && (
              <Link 
                to={`/r/${community.name.toLowerCase()}`}
                className="flex items-center mb-1 text-sm text-gray-500 hover:text-blue-600"
              >
                <Users className="w-4 h-4 mr-1" />
                <span className="truncate">r/{community.name}</span>
              </Link>
            )}
            <div onClick={handleContentClick} className="block cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 line-clamp-2">{title}</h2>
                {isProject && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Project
                  </span>
                )}
              </div>
              {isProject ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Problem:</h3>
                    <p className="text-gray-700 line-clamp-3">{problem}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Draft Solution:</h3>
                    <p className="text-gray-700 line-clamp-3">{solution}</p>
                  </div>
                  {renderSupporters()}
                </div>
              ) : (
                <p className="text-gray-700 mb-2 line-clamp-3 sm:line-clamp-4">{content}</p>
              )}
              {renderMedia()}
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-4">
                <span className="truncate">
                  Posted by{' '}
                  <button
                    onClick={handleUsernameClick}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {username || 'Anonymous'}
                  </button>
                </span>
                <span className="hidden sm:inline">•</span>
                <span>{formatDistanceToNow(new Date(created_at))} ago</span>
                <span className="hidden sm:inline">•</span>
                <button
                  onClick={handleCommentClick}
                  className="flex items-center hover:text-blue-600 transition-colors"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  <span>{currentCommentCount} comments</span>
                </button>
                {isCurrentUser && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                      }}
                      disabled={isDeleting}
                      className="flex items-center text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCommentsVisible && (
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <CommentSection postId={id} isProject={isProject} />
        </div>
      )}

      <ImageModal
        isOpen={showImageModal}
        imageUrl={media_url || ''}
        onClose={() => setShowImageModal(false)}
      />
    </>
  );
}