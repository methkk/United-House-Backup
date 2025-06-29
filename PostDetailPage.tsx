import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Post } from '../components/Post';
import { supabase } from '../lib/supabase';

interface PostData {
  id: string;
  title: string;
  content: string;
  score: number;
  created_at: string;
  user_id: string;
  media_type?: string | null;
  media_url?: string | null;
  community: {
    id: string;
    name: string;
  };
  post_comments: { count: number }[];
  votes: { value: number }[];
}

export function PostDetailPage() {
  const { communityName, postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = React.useState<PostData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          post_comments(count),
          votes(value),
          community:communities(
            id,
            name
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Post not found or has been deleted');
    } finally {
      setLoading(false);
    }
  };

  const handlePostDeleted = () => {
    navigate(`/r/${communityName}`);
  };

  const handleBackClick = () => {
    // Check if user came from homepage by looking at the state
    const fromHomepage = location.state?.fromHomepage;
    
    if (fromHomepage) {
      navigate('/', { replace: true });
      
      // Restore scroll position after navigation with a longer delay
      setTimeout(() => {
        const savedScrollPosition = sessionStorage.getItem('homepage-scroll-position');
        const postPosition = sessionStorage.getItem(`post-${postId}-position`);
        
        console.log('Restoring positions:', {
          savedScrollPosition,
          postPosition,
          postId
        });
        
        if (savedScrollPosition) {
          const scrollPos = parseInt(savedScrollPosition, 10);
          window.scrollTo({
            top: scrollPos,
            behavior: 'auto'
          });
          // Clean up stored positions
          sessionStorage.removeItem('homepage-scroll-position');
          sessionStorage.removeItem(`post-${postId}-position`);
        } else if (postPosition) {
          // Fallback to post position if available
          const postPos = parseInt(postPosition, 10);
          window.scrollTo({
            top: postPos,
            behavior: 'auto'
          });
          sessionStorage.removeItem(`post-${postId}-position`);
        } else {
          // Final fallback - try to find the post element by ID
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'auto', block: 'start' });
          }
        }
      }, 200); // Increased delay to ensure DOM is ready
    } else {
      navigate(`/r/${communityName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Post not found'}</p>
          <button
            onClick={handleBackClick}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const backText = location.state?.fromHomepage ? 'Back to Home' : `Back to r/${communityName}`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={handleBackClick}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backText}
        </button>
      </div>

      <Post
        id={post.id}
        title={post.title}
        content={post.content}
        score={post.score}
        created_at={post.created_at}
        author={post.user_id}
        commentCount={post.post_comments[0]?.count || 0}
        userVote={post.votes[0]?.value}
        community={post.community}
        media_type={post.media_type}
        media_url={post.media_url}
        isProject={false}
        showComments={true}
        onDelete={handlePostDeleted}
      />
    </div>
  );
}