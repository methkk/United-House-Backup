import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Calendar, Users, MessageSquare, MapPin, BadgeCheck, ChevronDown, ChevronUp, ClipboardList, CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface PublicProfile {
  id: string;
  username: string;
  official: boolean;
  created_at: string;
  avatar_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  location_country?: string | null;
  location_city?: string | null;
  location_town?: string | null;
  constituency?: string | null;
  postcode?: string | null;
}

interface UserPost {
  id: string;
  title: string;
  content: string;
  created_at: string;
  score: number;
  community: {
    name: string;
  };
}

interface UserProject {
  id: string;
  title: string;
  problem: string;
  solution: string;
  created_at: string;
  score: number;
  community: {
    name: string;
  };
}

interface UserCommunity {
  id: string;
  name: string;
  member_count: number;
  created_at: string;
}

interface UserAction {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  progress?: number;
  created_at: string;
  updated_at: string;
  completion_date?: string | null;
}

interface ActionUpdate {
  id: string;
  action_id: string;
  content: string;
  created_at: string;
  user_id: string;
}

export function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = React.useState<PublicProfile | null>(null);
  const [posts, setPosts] = React.useState<UserPost[]>([]);
  const [projects, setProjects] = React.useState<UserProject[]>([]);
  const [communities, setCommunities] = React.useState<UserCommunity[]>([]);
  const [actions, setActions] = React.useState<UserAction[]>([]);
  const [actionUpdates, setActionUpdates] = React.useState<{[key: string]: ActionUpdate[]}>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<string | null>(null);
  const [showAllCommunities, setShowAllCommunities] = React.useState(false);
  const [showAllActions, setShowAllActions] = React.useState(false);
  const [showUpdates, setShowUpdates] = React.useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    if (username) {
      fetchProfile();
      fetchCurrentUser();
    }
  }, [username]);

  React.useEffect(() => {
    if (profile) {
      fetchUserActivity();
      fetchUserActions();
    }
  }, [profile]);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user?.id || null);
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          official,
          created_at,
          avatar_url,
          verification_status,
          location_country,
          location_city,
          location_town,
          constituency,
          postcode
        `)
        .eq('username', username)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('User not found');
        } else {
          throw error;
        }
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivity = async () => {
    if (!profile) return;

    try {
      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          content,
          created_at,
          score,
          community:communities(name)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      // Fetch user's projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          problem,
          solution,
          created_at,
          score,
          community:communities(name)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (projectsError) throw projectsError;

      // Fetch communities created by user
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('id, name, member_count, created_at')
        .eq('creator_id', profile.id)
        .order('created_at', { ascending: false });

      if (communitiesError) throw communitiesError;

      setPosts(postsData || []);
      setProjects(projectsData || []);
      setCommunities(communitiesData || []);
    } catch (err) {
      console.error('Error fetching user activity:', err);
    }
  };

  const fetchUserActions = async () => {
    if (!profile) return;

    try {
      // Only fetch actions if the profile is official or if the current user is viewing their own profile
      if (!profile.official && profile.id !== currentUser) {
        return;
      }

      const { data, error } = await supabase
        .from('user_actions')
        .select('*')
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
      
      // Fetch updates for each action
      if (data && data.length > 0) {
        const actionIds = data.map(action => action.id);
        await fetchActionUpdates(actionIds);
      }
    } catch (err) {
      console.error('Error fetching user actions:', err);
    }
  };
  
  const fetchActionUpdates = async (actionIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('action_updates')
        .select('*')
        .in('action_id', actionIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group updates by action_id
      const updates: {[key: string]: ActionUpdate[]} = {};
      (data || []).forEach(update => {
        if (!updates[update.action_id]) {
          updates[update.action_id] = [];
        }
        updates[update.action_id].push(update);
      });

      setActionUpdates(updates);
    } catch (err) {
      console.error('Error fetching action updates:', err);
    }
  };

  const handleMessageUser = () => {
    // This would open the messages modal with this user pre-selected
    // For now, we'll just navigate to messages
    navigate('/messages');
  };
  
  const toggleShowUpdates = (actionId: string) => {
    setShowUpdates(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">Planned</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-600">In Progress</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-xs font-medium text-green-600">Completed</span>
          </div>
        );
      case 'cancelled':
        return (
          <div className="flex items-center space-x-1">
            <XCircle className="w-3 h-3 text-red-600" />
            <span className="text-xs font-medium text-red-600">Cancelled</span>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Profile not found'}</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser === profile.id;
  const displayedCommunities = showAllCommunities ? communities : communities.slice(0, 5);
  const hasMoreCommunities = communities.length > 5;
  const displayedActions = showAllActions ? actions : actions.slice(0, 5);
  const hasMoreActions = actions.length > 5;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="bg-blue-600 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white"
                  />
                ) : (
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold border-4 border-white">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-white">
                <div className="flex items-center space-x-2 mb-2">
                  <h1 className="text-2xl font-bold">@{profile.username}</h1>
                  {profile.official && (
                    <div className="flex items-center space-x-1">
                      <Shield className="w-6 h-6 text-white" />
                      <BadgeCheck className="w-6 h-6 text-white" />
                    </div>
                  )}
                  {profile.verification_status === 'verified' && !profile.official && (
                    <BadgeCheck className="w-6 h-6 text-white" />
                  )}
                </div>
                <div className="flex items-center space-x-4 text-blue-100">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
                  </div>
                  {profile.verification_status === 'verified' && (
                    <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {!isOwnProfile && currentUser && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleMessageUser}
                  className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors font-medium"
                >
                  Message
                </button>
                {isOwnProfile && (
                  <Link
                    to="/profile"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-400 transition-colors font-medium"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Account Status</h3>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    profile.official 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.official ? 'Official Account' : 'Standard Account'}
                  </span>
                </div>
              </div>

              {profile.constituency && (
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Parliamentary Constituency</p>
                    <p className="font-medium">{profile.constituency}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {profile.location_country && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">
                      {[profile.location_city, profile.location_town, profile.location_country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-2">Activity Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{posts.length}</div>
                    <div className="text-sm text-gray-500">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{projects.length}</div>
                    <div className="text-sm text-gray-500">Projects</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{communities.length}</div>
                    <div className="text-sm text-gray-500">Communities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions Section - Only for official accounts or own profile */}
      {(profile.official || isOwnProfile) && actions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
            Actions
          </h2>
          
          <div className="space-y-4">
            {displayedActions.map((action) => (
              <div 
                key={action.id} 
                className={`border rounded-lg p-4 ${
                  action.status === 'completed' ? 'border-green-200 bg-green-50' : 
                  action.status === 'in_progress' ? 'border-yellow-200 bg-yellow-50' :
                  action.status === 'cancelled' ? 'border-red-200 bg-red-50' :
                  'border-blue-200 bg-blue-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      {getStatusBadge(action.status)}
                    </div>
                    <p className="text-gray-700 mb-3">{action.description}</p>
                    
                    {action.status === 'in_progress' && typeof action.progress === 'number' && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium">{action.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${action.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center text-xs text-gray-500">
                      <span>Created: {format(new Date(action.created_at), 'MMM d, yyyy')}</span>
                      {action.status === 'completed' && action.completion_date && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Completed: {format(new Date(action.completion_date), 'MMM d, yyyy')}</span>
                        </>
                      )}
                      {action.updated_at && action.updated_at !== action.created_at && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Updated: {format(new Date(action.updated_at), 'MMM d, yyyy')}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Action Updates Section */}
                    {actionUpdates[action.id] && actionUpdates[action.id].length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleShowUpdates(action.id)}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {showUpdates[action.id] ? (
                            <>
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Hide Updates ({actionUpdates[action.id].length})
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4 mr-1" />
                              Show Updates ({actionUpdates[action.id].length})
                            </>
                          )}
                        </button>
                        
                        {showUpdates[action.id] && (
                          <div className="mt-2 pl-4 border-l-2 border-gray-200 space-y-3">
                            {actionUpdates[action.id].map((update) => (
                              <div key={update.id} className="text-sm">
                                <div className="flex items-start">
                                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-2 flex-shrink-0"></div>
                                  <div>
                                    <p className="text-gray-700">{update.content}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {format(new Date(update.created_at), 'MMM d, yyyy - h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {hasMoreActions && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAllActions(!showAllActions)}
                className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
              >
                {showAllActions ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show {actions.length - 5} More
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Activity Sections */}
      <div className="space-y-8">
        {/* Communities Created */}
        {communities.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-600" />
              Communities Created
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedCommunities.map((community) => (
                <Link
                  key={community.id}
                  to={`/r/${community.name}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <h4 className="font-medium text-gray-900">r/{community.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {community.member_count.toLocaleString()} members
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {format(new Date(community.created_at), 'MMM d, yyyy')}
                  </p>
                </Link>
              ))}
            </div>
            
            {hasMoreCommunities && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllCommunities(!showAllCommunities)}
                  className="inline-flex items-center px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showAllCommunities ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      Show {communities.length - 5} More
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Posts */}
        {posts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              Recent Posts
            </h2>
            <div className="space-y-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/r/${post.community.name}/post/${post.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Users className="w-4 h-4 mr-1" />
                    r/{post.community.name}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{post.title}</h4>
                  <p className="text-gray-600 line-clamp-2">{post.content}</p>
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <span>{post.score} points</span>
                    <span className="mx-2">•</span>
                    <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Projects */}
        {projects.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-green-600" />
              Recent Projects
            </h2>
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/r/${project.community.name}/project/${project.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <Users className="w-4 h-4 mr-1" />
                    r/{project.community.name}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{project.title}</h4>
                  <p className="text-gray-600 line-clamp-2">{project.problem}</p>
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <span>{project.score} points</span>
                    <span className="mx-2">•</span>
                    <span>{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* No Activity Message */}
        {posts.length === 0 && projects.length === 0 && communities.length === 0 && actions.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <Users className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
            <p className="text-gray-500">
              {profile.username} hasn't created any posts, projects, or communities yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}