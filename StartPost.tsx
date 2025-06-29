import React from 'react';
import { Image, Link as LinkIcon, MessageSquare, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StartPostProps {
  onCreatePost: (isProject?: boolean) => void;
}

export function StartPost({ onCreatePost }: StartPostProps) {
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState<{ avatar_url?: string; username?: string } | null>(null);

  React.useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        // Fetch user profile
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url, username')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (data) {
          setProfile(data);
        }
      }
    };

    fetchUserAndProfile();
  }, []);

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Create Post</h2>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-gray-200"></div>
          <button
            onClick={() => onCreatePost()}
            className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-md px-4 py-2 text-gray-500 text-left"
          >
            Login to start posting
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold mb-4">Create Post</h2>
      <div className="flex items-center space-x-4 mb-4">
        {profile?.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt={profile.username}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {profile?.username?.[0].toUpperCase() || user.email?.[0].toUpperCase()}
            </span>
          </div>
        )}
        <button
          onClick={() => onCreatePost()}
          className="flex-1 bg-gray-50 hover:bg-gray-100 rounded-md px-4 py-2 text-gray-500 text-left"
        >
          Start a discussion...
        </button>
      </div>
      <div className="flex items-center justify-around pt-2 border-t">
        <button
          onClick={() => onCreatePost()}
          className="flex items-center space-x-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-md"
        >
          <Image className="w-5 h-5" />
          <span>Image</span>
        </button>
        <button
          onClick={() => onCreatePost()}
          className="flex items-center space-x-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-md"
        >
          <LinkIcon className="w-5 h-5" />
          <span>Link</span>
        </button>
        <button
          onClick={() => onCreatePost()}
          className="flex items-center space-x-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-md"
        >
          <MessageSquare className="w-5 h-5" />
          <span>Post</span>
        </button>
        <button
          onClick={() => onCreatePost(true)}
          className="flex items-center space-x-2 text-gray-500 hover:bg-gray-50 px-4 py-2 rounded-md"
        >
          <Lightbulb className="w-5 h-5" />
          <span>Project</span>
        </button>
      </div>
    </div>
  );
}