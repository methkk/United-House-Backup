import React from 'react';
import { MessageCircle, UserPlus, UserCheck, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface UserProfileCardProps {
  userId: string;
  username: string;
  avatarUrl?: string | null;
  isOfficial?: boolean;
  onMessageClick?: (userId: string) => void;
  showActions?: boolean;
}

export function UserProfileCard({ 
  userId, 
  username, 
  avatarUrl, 
  isOfficial = false,
  onMessageClick,
  showActions = true 
}: UserProfileCardProps) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState<string | null>(null);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user?.id || null);
  };

  const handleMessageClick = () => {
    if (onMessageClick) {
      onMessageClick(userId);
    }
  };

  const handleFollowClick = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // In a real implementation, you would have a follows table
      // For now, we'll just toggle the state
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error('Error following user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = () => {
    navigate(`/user/${username}`);
  };

  const isOwnProfile = currentUser === userId;

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div 
        className="flex items-center space-x-3 cursor-pointer"
        onClick={handleProfileClick}
      >
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-lg">
                {username[0].toUpperCase()}
              </span>
            </div>
          )}
          {/* Online indicator - in a real app, you'd track this */}
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-medium text-gray-900">@{username}</h3>
            {isOfficial && (
              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <Shield className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {isOfficial ? 'Official Account' : 'Active now'}
          </p>
        </div>
      </div>

      {showActions && !isOwnProfile && currentUser && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleMessageClick}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
            title="Send Message"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button
            onClick={handleFollowClick}
            disabled={loading}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
              <div className="flex items-center space-x-1">
                <UserCheck className="w-4 h-4" />
                <span>Following</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <UserPlus className="w-4 h-4" />
                <span>Follow</span>
              </div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}