import React from 'react';
import { Post } from '../components/Post';
import { CommunitiesSidebar } from '../components/CommunitiesSidebar';
import { TrendingPosts } from '../components/TrendingPosts';
import { TrendingProjects } from '../components/TrendingProjects';
import { StartPost } from '../components/StartPost';
import { CreatePostModal } from '../components/CreatePostModal';
import { SEOHead } from '../components/SEOHead';
import { supabase } from '../lib/supabase';

interface CombinedPost {
  id: string;
  title: string;
  content?: string;
  problem?: string;
  solution?: string;
  score: number;
  created_at: string;
  user_id: string;
  comments: { count: number }[];
  votes: { value: number }[];
  community: {
    id: string;
    name: string;
  };
  media_type?: string | null;
  media_url?: string | null;
  isProject?: boolean;
}

export function HomePage() {
  const [posts, setPosts] = React.useState<CombinedPost[]>([]);
  const [trendingPosts, setTrendingPosts] = React.useState([]);
  const [trendingProjects, setTrendingProjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [showCreatePost, setShowCreatePost] = React.useState(false);
  const [isProjectPost, setIsProjectPost] = React.useState(false);

  React.useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch regular posts with correct relationship names
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          post_comments(count),
          votes(value),
          communities!posts_community_id_fkey(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch projects with correct relationship names
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_comments(count),
          project_votes(value),
          communities!projects_community_id_fkey(
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Fetch trending posts with correct relationship names
      const { data: trendingData, error: trendingError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          score,
          created_at,
          post_comments(count),
          communities!posts_community_id_fkey(
            name
          )
        `)
        .order('score', { ascending: false })
        .limit(5);

      if (trendingError) throw trendingError;

      // Fetch trending projects with correct relationship names
      const { data: trendingProjectsData, error: trendingProjectsError } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          score,
          created_at,
          project_comments(count),
          communities!projects_community_id_fkey(
            name
          )
        `)
        .order('score', { ascending: false })
        .limit(3);

      if (trendingProjectsError) throw trendingProjectsError;

      // Combine and sort posts and projects by creation date
      const allPosts = [
        ...(postsData || []).map(post => ({ 
          ...post, 
          isProject: false,
          comments: post.post_comments || [],
          community: post.communities
        })),
        ...(projectsData || []).map(project => ({ 
          ...project, 
          isProject: true,
          comments: project.project_comments || [],
          votes: project.project_votes || [],
          community: project.communities
        }))
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(allPosts);
      setTrendingPosts((trendingData || []).map(post => ({
        ...post,
        commentCount: post.post_comments?.[0]?.count || 0,
        community: post.communities
      })));
      setTrendingProjects((trendingProjectsData || []).map(project => ({
        ...project,
        commentCount: project.project_comments?.[0]?.count || 0,
        community: project.communities
      })));
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <SEOHead />
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SEOHead />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">
              {error}. Please try refreshing the page or contact support if the problem persists.
            </p>
            <button
              onClick={fetchPosts}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="United-House | Connect with Government Officials & Communities"
        description="Join United-House to connect with government officials, participate in community discussions, and engage in meaningful civic dialogue. The premier platform for democratic participation."
        keywords="United House, united-house, government officials, civic engagement, community discussions, democracy, political participation, local government"
      />
      
      {/* Hidden SEO content for better keyword targeting */}
      <div className="sr-only">
        <h1>United-House: The Premier Platform for Government and Community Engagement</h1>
        <p>
          Welcome to United-House (united-house.com), the leading platform connecting citizens with government officials and departments. 
          Join communities, discuss policies, create projects, and engage in productive civic dialogue. 
          United House provides a secure, verified environment for democratic participation and community building.
        </p>
        <h2>Features of United-House</h2>
        <ul>
          <li>Connect directly with verified government officials</li>
          <li>Join local and national community discussions</li>
          <li>Create and support civic projects</li>
          <li>Participate in policy discussions</li>
          <li>Identity verification for authentic engagement</li>
          <li>Secure messaging with officials and community members</li>
        </ul>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TrendingPosts posts={trendingPosts} />
              <TrendingProjects projects={trendingProjects} />
            </div>
            <StartPost 
              onCreatePost={(isProject) => {
                setIsProjectPost(isProject || false);
                setShowCreatePost(true);
              }}
            />
            <div className="space-y-4">
              {posts.map((post) => (
                <Post
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  content={post.isProject ? undefined : post.content}
                  problem={post.isProject ? post.problem : undefined}
                  solution={post.isProject ? post.solution : undefined}
                  score={post.score}
                  created_at={post.created_at}
                  author={post.user_id}
                  commentCount={post.comments[0]?.count || 0}
                  userVote={post.votes?.[0]?.value}
                  community={post.community}
                  media_type={post.isProject ? undefined : post.media_type}
                  media_url={post.isProject ? undefined : post.media_url}
                  isProject={post.isProject}
                />
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <CommunitiesSidebar />
            </div>
          </div>
        </div>
        
        <CreatePostModal 
          isOpen={showCreatePost}
          onClose={() => setShowCreatePost(false)}
          isProject={isProjectPost}
        />
      </div>
    </>
  );
}