import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, LogOut, PlusCircle, Target, User, Shield, MessageCircle, Menu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreatePostModal } from './CreatePostModal';
import { MessagesModal } from './MessagesModal';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState<{ avatar_url?: string; username?: string; official?: boolean } | null>(null);
  const [showPurpose, setShowPurpose] = React.useState(false);
  const [showMenu, setShowMenu] = React.useState(false);
  const [showCreatePost, setShowCreatePost] = React.useState(false);
  const [showMessages, setShowMessages] = React.useState(false);
  const [isFounder, setIsFounder] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkFounderStatus(session.user.id);
        fetchUnreadCount(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        checkFounderStatus(session.user.id);
        fetchUnreadCount(session.user.id);
      } else {
        setProfile(null);
        setIsFounder(false);
        setUnreadCount(0);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, username, official')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const checkFounderStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsFounder(data?.username === 'The_Founder');
    } catch (err) {
      console.error('Error checking founder status:', err);
      setIsFounder(false);
    }
  };

  const fetchUnreadCount = async (userId: string) => {
    try {
      // Get user's conversations
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', userId);

      if (!participations) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;

      // Calculate unread messages for each conversation
      for (const participation of participations) {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', participation.conversation_id)
          .neq('sender_id', userId)
          .gt('created_at', participation.last_read_at || '1970-01-01');

        totalUnread += count || 0;
      }

      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setUnreadCount(0);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !(menuRef.current as HTMLElement).contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Set up real-time updates for unread count
  React.useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('message-updates')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchUnreadCount(user.id);
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_participants' },
        () => {
          fetchUnreadCount(user.id);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      console.log('Starting sign out process...');
      
      setShowMenu(false);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }
      
      console.log('Sign out successful');
      
      setUser(null);
      setProfile(null);
      setIsFounder(false);
      setUnreadCount(0);
      
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
      
      navigate('/');
      
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (err) {
      console.error('Error during logout:', err);
      alert('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const isOnLoginPage = location.pathname === '/login';

  return (
    <>
      <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4 sm:space-x-8">
              <Link to="/" className="text-xl sm:text-2xl font-bold text-blue-600 whitespace-nowrap">
                United-House
              </Link>
              <button
                onClick={() => setShowPurpose(true)}
                className="hidden sm:flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Target className="w-5 h-5 mr-2" />
                <span className="font-medium">Purpose</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                <>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="inline-flex items-center px-2 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create Post</span>
                  </button>
                  
                  <button
                    onClick={() => setShowMessages(true)}
                    className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                        <div className="py-1" role="menu">
                          <div className="px-4 py-2 border-b border-gray-100">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">
                                @{profile?.username || 'User'}
                              </span>
                              {profile?.official && (
                                <Shield className="w-4 h-4 text-blue-500" />
                              )}
                            </div>
                          </div>
                          
                          <Link
                            to="/profile"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            onClick={() => setShowMenu(false)}
                          >
                            Your Profile
                          </Link>
                          <Link
                            to="/settings"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            onClick={() => setShowMenu(false)}
                          >
                            Settings
                          </Link>
                          <button
                            onClick={() => {
                              setShowMessages(true);
                              setShowMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                          >
                            <div className="flex items-center justify-between">
                              <span>Messages</span>
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                  {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => setShowPurpose(true)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 sm:hidden"
                            role="menuitem"
                          >
                            Purpose
                          </button>
                          <Link
                            to="/about"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            onClick={() => setShowMenu(false)}
                          >
                            About
                          </Link>
                          {isFounder && (
                            <Link
                              to="/admin/verification"
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                              role="menuitem"
                              onClick={() => setShowMenu(false)}
                            >
                              Admin
                            </Link>
                          )}
                          <div className="border-t border-gray-100">
                            <button
                              onClick={handleLogout}
                              disabled={isSigningOut}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                              role="menuitem"
                            >
                              {isSigningOut ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                                  Signing out...
                                </>
                              ) : (
                                <>
                                  <LogOut className="w-4 h-4 mr-2" />
                                  Sign out
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {isOnLoginPage ? (
                    <Link
                      to="/"
                      className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Back to Home</span>
                      <span className="sm:hidden">Home</span>
                    </Link>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      <LogIn className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign in</span>
                      <span className="sm:hidden">Login</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="h-16"></div>

      {showPurpose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md relative">
            <button
              onClick={() => setShowPurpose(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <div className="mb-4">
              <Target className="w-8 h-8 text-blue-600 mb-4" />
              <h2 className="text-xl font-semibold mb-4">Our Purpose</h2>
              <p className="text-gray-600 leading-relaxed">
                United-House was created to connect people in towns, cities and countries to their respective government officials and departments.
              </p>
              <p className="text-gray-600 leading-relaxed mt-4">
                A platform that allows productive communication with residents to discuss problems and work together to develop solutions. No fake accounts. No Hate speech.
              </p>
            </div>
          </div>
        </div>
      )}

      <CreatePostModal 
        isOpen={showCreatePost}
        onClose={() => setShowCreatePost(false)}
      />

      <MessagesModal
        isOpen={showMessages}
        onClose={() => setShowMessages(false)}
      />
    </>
  );
}