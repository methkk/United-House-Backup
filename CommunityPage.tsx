import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, AlertCircle, Settings, Shield } from 'lucide-react';
import { Post } from '../components/Post';
import { StartPost } from '../components/StartPost';
import { CreatePostModal } from '../components/CreatePostModal';
import { MemberManagementModal } from '../components/MemberManagementModal';
import { supabase } from '../lib/supabase';

interface CommunityPost {
  id: string;
  title: string;
  content: string;
  score: number;
  created_at: string;
  user_id: string;
  comments: { count: number }[];
  votes: { value: number }[];
  media_type?: string | null;
  media_url?: string | null;
}

interface Project {
  id: string;
  title: string;
  problem: string;
  solution: string;
  score: number;
  created_at: string;
  user_id: string;
  project_replies: { count: number }[];
  project_votes: { value: number }[];
}

export function CommunityPage() {
  const { communityName } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = React.useState<(CommunityPost | Project)[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = React.useState(false);
  const [showMemberManagement, setShowMemberManagement] = React.useState(false);
  const [isMember, setIsMember] = React.useState(false);
  const [isCreator, setIsCreator] = React.useState(false);
  const [joiningCommunity, setJoiningCommunity] = React.useState(false);
  const [communityInfo, setCommunityInfo] = React.useState({
    id: '',
    name: communityName,
    memberCount: 0,
    description: '',
    creator_id: '',
    requires_verification: false
  });
  const [isProjectPost, setIsProjectPost] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<{
    verification_status: string | null;
    official: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (communityName) {
      fetchCommunityInfo();
    }
  }, [communityName]);

  React.useEffect(() => {
    if (communityInfo.id) {
      fetchCommunityPosts();
      checkMembership();
      checkCreator();
      fetchUserProfile();
    }
  }, [communityInfo.id]);

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, official')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchCommunityInfo = async () => {
    if (!communityName) return null;

    try {
      const decodedName = decodeURIComponent(communityName);
      
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .ilike('name', decodedName)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCommunityInfo({
          id: data.id,
          name: data.name,
          memberCount: data.member_count,
          description: data.description || '',
          creator_id: data.creator_id,
          requires_verification: data.requires_verification
        });
        return data.id;
      }
      
      setError('Community not found');
      return null;
    } catch (err) {
      console.error('Error fetching community:', err);
      setError('Error loading community');
      return null;
    }
  };

  const checkMembership = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('community_members')
        .select('id, status')
        .eq('community_id', communityInfo.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;
      setIsMember(data?.status === 'active');
    } catch (err) {
      console.error('Error checking membership:', err);
    }
  };

  const checkCreator = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setIsCreator(session.user.id === communityInfo.creator_id);
    } catch (err) {
      console.error('Error checking creator status:', err);
    }
  };

  const formatMemberCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const handleJoinCommunity = async () => {
    try {
      setJoiningCommunity(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to join communities');
        return;
      }

      // Check if verification is required
      if (communityInfo.requires_verification && 
          userProfile?.verification_status !== 'verified' && 
          !userProfile?.official) {
        setError('This community requires identity verification. Please verify your identity in your profile settings before joining.');
        return;
      }

      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: communityInfo.id,
          user_id: session.user.id,
          status: 'active'
        });

      if (error) {
        if (error.message.includes('blocked')) {
          setError('You have been blocked from this community');
          return;
        }
        throw error;
      }

      setIsMember(true);
      setCommunityInfo(prev => ({
        ...prev,
        memberCount: prev.memberCount + 1
      }));
    } catch (err) {
      console.error('Error joining community:', err);
      setError('Failed to join community');
    } finally {
      setJoiningCommunity(false);
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      setJoiningCommunity(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityInfo.id)
        .eq('user_id', session.user.id);

      if (error) throw error;

      setIsMember(false);
      setCommunityInfo(prev => ({
        ...prev,
        memberCount: prev.memberCount - 1
      }));
    } catch (err) {
      console.error('Error leaving community:', err);
      setError('Failed to leave community');
    } finally {
      setJoiningCommunity(false);
    }
  };

  const handleCommunityDeleted = () => {
    // Navigate back to home page when community is deleted
    navigate('/');
  };

  const fetchCommunityPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch regular posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          comments(count),
          votes(value)
        `)
        .eq('community_id', communityInfo.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          project_replies(count),
          project_votes(value)
        `)
        .eq('community_id', communityInfo.id)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Combine and sort posts and projects by creation date
      const allPosts = [
        ...(postsData || []).map(post => ({ ...post, isProject: false })),
        ...(projectsData || []).map(project => ({ 
          ...project, 
          isProject: true,
          comments: project.project_replies,
          votes: project.project_votes
        }))
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setPosts(allPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Error loading posts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">r/{communityInfo.name}</h1>
                <p className="text-gray-600">{formatMemberCount(communityInfo.memberCount)} members</p>
                {communityInfo.requires_verification && (
                  <div className="flex items-center mt-1 text-blue-600">
                    <Shield className="w-4 h-4 mr-1" />
                    <span className="text-sm">Verified members only</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isCreator && (
                <button
                  onClick={() => setShowMemberManagement(true)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Manage Community</span>
                </button>
              )}
              {!isMember && (
                <button
                  onClick={handleJoinCommunity}
                  disabled={joiningCommunity}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {joiningCommunity ? 'Joining...' : 'Join Community'}
                </button>
              )}
              {isMember && !isCreator && (
                <button
                  onClick={handleLeaveCommunity}
                  disabled={joiningCommunity}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {joiningCommunity ? 'Leaving...' : 'Leave Community'}
                </button>
              )}
            </div>
          </div>
          {communityInfo.description && (
            <p className="mt-4 text-gray-700">{communityInfo.description}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {!isMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-700">
              Join this community to create posts and interact with other members
              {communityInfo.requires_verification && !userProfile?.verification_status && !userProfile?.official && (
                <span className="block mt-1">
                  This community requires identity verification. Please verify your identity in your profile settings before joining.
                </span>
              )}
            </p>
          </div>
        )}
        
        {isMember && (
          <StartPost 
            onCreatePost={(isProject) => {
              setIsProjectPost(isProject || false);
              setShowCreatePost(true);
            }} 
          />
        )}
        
        {posts.map((post) => (
          <Post
            key={post.id}
            id={post.id}
            title={post.title}
            content={post.isProject ? undefined : post.content}
            problem={post.isProject ? (post as Project).problem : undefined}
            solution={post.isProject ? (post as Project).solution : undefined}
            score={post.score}
            created_at={post.created_at}
            author={post.user_id}
            commentCount={post.comments[0]?.count || 0}
            userVote={post.votes[0]?.value}
            community={{
              id: communityInfo.id,
              name: communityInfo.name
            }}
            media_type={post.isProject ? undefined : (post as CommunityPost).media_type}
            media_url={post.isProject ? undefined : (post as CommunityPost).media_url}
            isProject={post.isProject}
          />
        ))}
        {posts.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">No posts in this community yet.</p>
          </div>
        )}
      </div>

      <CreatePostModal 
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        isProject={isProjectPost}
        preselectedCommunityId={communityInfo.id}
        preselectedCommunityName={communityInfo.name}
      />

      <MemberManagementModal
        isOpen={showMemberManagement}
        onClose={() => setShowMemberManagement(false)}
        communityId={communityInfo.id}
        communityName={communityInfo.name}
        onCommunityDeleted={handleCommunityDeleted}
      />
    </div>
  );
}