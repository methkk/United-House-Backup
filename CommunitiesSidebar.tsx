import React from 'react';
import { Users, TrendingUp, Star, Search, Shield, BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Community {
  id: string;
  name: string;
  member_count: number;
  description: string;
}

interface OfficialProfile {
  id: string;
  username: string;
}

export function CommunitiesSidebar() {
  const [showModal, setShowModal] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [error, setError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [officialProfiles, setOfficialProfiles] = React.useState<OfficialProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Community[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);

  React.useEffect(() => {
    fetchCommunities();
    fetchOfficialProfiles();
  }, []);

  React.useEffect(() => {
    const searchCommunities = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .ilike('name', `%${searchQuery}%`)
          .order('member_count', { ascending: false })
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Error searching communities:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchCommunities, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchCommunities = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .order('member_count', { ascending: false });

      if (error) throw error;
      setCommunities(data || []);
    } catch (err) {
      console.error('Error fetching communities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOfficialProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('official', true)
        .order('username');

      if (error) throw error;
      setOfficialProfiles(data || []);
    } catch (err) {
      console.error('Error fetching official profiles:', err);
    }
  };

  const getIconForCommunity = (index: number) => {
    switch (index) {
      case 0:
        return <TrendingUp className="w-4 h-4" />;
      case 1:
        return <Star className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('You must be logged in to create a community');

      const { error: communityError } = await supabase
        .from('communities')
        .insert([
          {
            name,
            description,
            creator_id: session.user.id,
            member_count: 1
          }
        ]);

      if (communityError) throw communityError;

      setName('');
      setDescription('');
      setShowModal(false);
      fetchCommunities();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedCommunities = searchQuery.trim() ? searchResults : communities;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Communities</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center p-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mt-2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Communities</h2>
              <div className="relative w-28">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-4 py-1 text-sm rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
                <Search className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
                {isSearching && (
                  <div className="absolute right-2 top-1.5">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            <div className="space-y-1 p-4">
              {displayedCommunities.map((community, index) => (
                <Link
                  key={community.id}
                  to={`/r/${community.name.toLowerCase()}`}
                  className="flex items-center p-2 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                      {getIconForCommunity(index)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">r/{community.name}</h3>
                      <p className="text-sm text-gray-500">
                        {formatMemberCount(community.member_count)} members
                      </p>
                    </div>
                  </div>
                  {!searchQuery && index < 2 && (
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      Trending
                    </span>
                  )}
                </Link>
              ))}
              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className="text-center py-4 text-gray-500">
                  No communities found
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t">
            <button
              onClick={() => setShowModal(true)}
              className="w-full bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700 transition-colors"
            >
              Create Community
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Official Profiles</h2>
          </div>
          <div className="space-y-3">
            {officialProfiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/user/${profile.username}`}
                className="flex items-center p-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">@{profile.username}</span>
                  <BadgeCheck className="w-4 h-4 text-blue-500 ml-1" />
                </div>
              </Link>
            ))}
            {officialProfiles.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No official profiles yet
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Create a Community</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Community Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={3}
                  maxLength={21}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Community names must be between 3-21 characters
                </p>
              </div>

              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Tell us about your community..."
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Community'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}