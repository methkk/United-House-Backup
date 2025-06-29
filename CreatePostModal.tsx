import React from 'react';
import { X, Image, Film, Smile, Link as LinkIcon, Search, Loader2, Lightbulb, BadgeCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProject?: boolean;
  preselectedCommunityId?: string;
  preselectedCommunityName?: string;
}

interface Community {
  id: string;
  name: string;
  member_count: number;
}

interface OfficialProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

type MediaType = 'photo' | 'video' | 'gif' | 'link' | null;

export function CreatePostModal({ 
  isOpen, 
  onClose, 
  isProject = false, 
  preselectedCommunityId,
  preselectedCommunityName 
}: CreatePostModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = React.useState('');
  const [content, setContent] = React.useState('');
  const [problem, setProblem] = React.useState('');
  const [solution, setSolution] = React.useState('');
  const [isProjectPost, setIsProjectPost] = React.useState(isProject);
  const [selectedCommunity, setSelectedCommunity] = React.useState<string>('');
  const [communitySearch, setCommunitySearch] = React.useState('');
  const [showCommunityDropdown, setShowCommunityDropdown] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [communities, setCommunities] = React.useState<Community[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [officialProfiles, setOfficialProfiles] = React.useState<OfficialProfile[]>([]);
  const [selectedSupporters, setSelectedSupporters] = React.useState<OfficialProfile[]>([]);
  const [supporterSearch, setSupporterSearch] = React.useState('');
  const [showSupporterDropdown, setShowSupporterDropdown] = React.useState(false);
  const [loadingProfiles, setLoadingProfiles] = React.useState(false);
  const supporterDropdownRef = React.useRef<HTMLDivElement>(null);

  // Media states
  const [mediaType, setMediaType] = React.useState<MediaType>(null);
  const [mediaUrl, setMediaUrl] = React.useState('');
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
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
      }
    };

    if (isOpen) {
      fetchCommunities();
    }
  }, [isOpen]);

  // Auto-select community when modal opens
  React.useEffect(() => {
    if (isOpen && preselectedCommunityId) {
      setSelectedCommunity(preselectedCommunityId);
    } else if (isOpen && !preselectedCommunityId) {
      // Try to detect community from URL
      const pathParts = location.pathname.split('/');
      if (pathParts[1] === 'r' && pathParts[2]) {
        const communityName = pathParts[2];
        // Find community by name
        const community = communities.find(c => c.name.toLowerCase() === communityName.toLowerCase());
        if (community) {
          setSelectedCommunity(community.id);
        }
      }
    }
  }, [isOpen, preselectedCommunityId, location.pathname, communities]);

  React.useEffect(() => {
    const searchCommunities = async () => {
      if (!communitySearch.trim()) {
        setCommunities(communities);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from('communities')
          .select('*')
          .ilike('name', `%${communitySearch}%`)
          .order('member_count', { ascending: false });

        if (error) throw error;
        setCommunities(data || []);
      } catch (err) {
        console.error('Error searching communities:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchCommunities, 300);
    return () => clearTimeout(debounceTimer);
  }, [communitySearch]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCommunityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (supporterDropdownRef.current && !supporterDropdownRef.current.contains(event.target as Node)) {
        setShowSupporterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (supporterSearch.trim()) {
      const debounceTimer = setTimeout(() => {
        searchOfficialProfiles(supporterSearch);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setOfficialProfiles([]);
    }
  }, [supporterSearch]);

  const searchOfficialProfiles = async (query: string) => {
    try {
      setLoadingProfiles(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('official', true)
        .ilike('username', `%${query}%`)
        .limit(5);

      if (error) throw error;
      setOfficialProfiles(data || []);
    } catch (err) {
      console.error('Error searching official profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    setMediaUrl(URL.createObjectURL(file));
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('post-media')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('post-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleMediaTypeSelect = (type: MediaType) => {
    setMediaType(type);
    setMediaUrl('');
    setMediaFile(null);

    if (type === 'photo' || type === 'video') {
      fileInputRef.current?.click();
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
    if (!selectedCommunity) {
      setError('Please select a community');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('You must be logged in to create a post');

      // Check if user is a member of the selected community
      const { data: membershipData, error: membershipError } = await supabase
        .from('community_members')
        .select('status')
        .eq('community_id', selectedCommunity)
        .eq('user_id', session.user.id)
        .single();

      if (membershipError || !membershipData) {
        setError('You must be a member of this community to create a post. Please join the community first.');
        return;
      }

      if (membershipData.status !== 'active') {
        setError('Your membership status does not allow you to create posts in this community.');
        return;
      }

      let finalMediaUrl = mediaUrl;
      
      if (mediaFile) {
        setIsUploading(true);
        finalMediaUrl = await uploadMedia(mediaFile);
        setIsUploading(false);
      }

      if (isProjectPost) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert([{
            title,
            problem,
            solution,
            user_id: session.user.id,
            community_id: selectedCommunity,
          }])
          .select()
          .single();

        if (projectError) throw projectError;

        if (selectedSupporters.length > 0) {
          const { error: supportersError } = await supabase
            .from('project_supporters')
            .insert(
              selectedSupporters.map(supporter => ({
                project_id: project.id,
                supporter_id: supporter.id,
              }))
            );

          if (supportersError) throw supportersError;
        }
      } else {
        const { error: postError } = await supabase
          .from('posts')
          .insert([
            {
              title,
              content,
              user_id: session.user.id,
              community_id: selectedCommunity,
              media_type: mediaType,
              media_url: finalMediaUrl || null,
            },
          ]);

        if (postError) throw postError;
      }

      const selectedCommunityData = communities.find(c => c.id === selectedCommunity);
      
      setTitle('');
      setContent('');
      setProblem('');
      setSolution('');
      setSelectedCommunity('');
      setSelectedSupporters([]);
      setMediaType(null);
      setMediaUrl('');
      setMediaFile(null);
      onClose();
      
      navigate(`/r/${selectedCommunityData?.name.toLowerCase()}`);
    } catch (err) {
      console.error('Error creating post:', err);
      if (err instanceof Error) {
        if (err.message.includes('row-level security policy')) {
          setError('You must be a member of this community to create a post. Please join the community first.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An error occurred while creating the post. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const renderSupporterSelection = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Project Supporters
      </label>
      <p className="text-sm text-gray-500 mb-2">
        Select up to 2 official profiles to support your project
      </p>
      
      <div className="space-y-2">
        {selectedSupporters.map(supporter => (
          <div key={supporter.id} className="flex items-center justify-between bg-blue-50 p-2 rounded-md">
            <div className="flex items-center space-x-2">
              {supporter.avatar_url ? (
                <img
                  src={supporter.avatar_url}
                  alt={supporter.username}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">
                    {supporter.username[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="font-medium text-blue-700">@{supporter.username}</span>
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            </div>
            <button
              type="button"
              onClick={() => setSelectedSupporters(supporters => 
                supporters.filter(s => s.id !== supporter.id)
              )}
              className="text-blue-700 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {selectedSupporters.length < 2 && (
          <div className="relative" ref={supporterDropdownRef}>
            <div
              onClick={() => setShowSupporterDropdown(true)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center"
            >
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Search for official profiles..."
                value={supporterSearch}
                onChange={(e) => setSupporterSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 focus:outline-none"
              />
            </div>

            {showSupporterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                {loadingProfiles ? (
                  <div className="p-4 text-center text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    <p className="mt-1">Searching profiles...</p>
                  </div>
                ) : officialProfiles.length > 0 ? (
                  officialProfiles.map(profile => (
                    <button
                      key={profile.id}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      onClick={() => {
                        if (!selectedSupporters.find(s => s.id === profile.id)) {
                          setSelectedSupporters(supporters => [...supporters, profile]);
                        }
                        setShowSupporterDropdown(false);
                        setSupporterSearch('');
                      }}
                    >
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile.username}
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {profile.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="font-medium">@{profile.username}</span>
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    {supporterSearch.trim()
                      ? 'No official profiles found'
                      : 'Type to search official profiles'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  const selectedCommunityData = communities.find(c => c.id === selectedCommunity);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">Create a {isProjectPost ? 'Project' : 'Post'}</h2>
            <button
              onClick={() => setIsProjectPost(!isProjectPost)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isProjectPost 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Lightbulb className="w-4 h-4" />
              <span>Make Project</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 relative" ref={dropdownRef}>
            <div
              className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex items-center justify-between"
              onClick={() => setShowCommunityDropdown(!showCommunityDropdown)}
            >
              {selectedCommunity ? (
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-2">
                    <span className="text-sm">r/</span>
                  </div>
                  <span className="text-gray-900">{selectedCommunityData?.name}</span>
                </div>
              ) : (
                <span className="text-gray-500">Choose a community</span>
              )}
              <span className="text-gray-400">▼</span>
            </div>

            {showCommunityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-96 overflow-hidden">
                <div className="p-2 border-b sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search communities"
                      value={communitySearch}
                      onChange={(e) => setCommunitySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-2.5">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[calc(24rem-56px)]">
                  {communities.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {isSearching ? 'Searching...' : 'No communities found'}
                    </div>
                  ) : (
                    communities.map((community) => (
                      <button
                        key={community.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-0"
                        onClick={() => {
                          setSelectedCommunity(community.id);
                          setShowCommunityDropdown(false);
                        }}
                      >
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3">
                            <span className="text-sm">r/</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{community.name}</h3>
                            <p className="text-sm text-gray-500">
                              {formatMemberCount(community.member_count)} members
                            </p>
                          </div>
                        </div>
                        {selectedCommunity === community.id && (
                          <span className="text-blue-600">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={3}
            />
          </div>

          {isProjectPost ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Problem
                </label>
                <textarea
                  placeholder="Describe the problem you want to solve..."
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Draft Solution
                </label>
                <textarea
                  placeholder="Share your proposed solution..."
                  value={solution}
                  onChange={(e) => setSolution(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  required
                />
              </div>
              {renderSupporterSelection()}
            </>
          ) : (
            <>
              <div className="mb-4">
                <textarea
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px]"
                  required
                />
              </div>

              {mediaType && (
                <div className="mb-4">
                  {mediaType === 'link' ? (
                    <input
                      type="url"
                      placeholder="Enter URL"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : mediaUrl ? (
                    <div className="relative">
                      {mediaType === 'photo' && (
                        <img
                          src={mediaUrl}
                          alt="Preview"
                          className="max-h-64 rounded-lg mx-auto"
                        />
                      )}
                      {mediaType === 'video' && (
                        <video
                          src={mediaUrl}
                          controls
                          className="max-h-64 rounded-lg mx-auto"
                        />
                      )}
                      {mediaType === 'gif' && (
                        <img
                          src={mediaUrl}
                          alt="GIF Preview"
                          className="max-h-64 rounded-lg mx-auto"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaType(null);
                          setMediaUrl('');
                          setMediaFile(null);
                        }}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center">
                        <p className="text-gray-600">
                          {mediaType === 'photo' ? 'Upload a photo' :
                           mediaType === 'video' ? 'Upload a video' :
                           'Upload a GIF'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={
                  mediaType === 'photo' ? 'image/*' :
                  mediaType === 'video' ? 'video/*' :
                  mediaType === 'gif' ? 'image/gif' :
                  undefined
                }
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center space-x-4 mb-4 border-t border-b py-3">
                <button
                  type="button"
                  onClick={() => handleMediaTypeSelect('photo')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                    mediaType === 'photo'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Image className="w-5 h-5" />
                  <span>Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeSelect('video')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                    mediaType === 'video'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Film className="w-5 h-5" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeSelect('gif')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                    mediaType === 'gif'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Smile className="w-5 h-5" />
                  <span>GIF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMediaTypeSelect('link')}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
                    mediaType === 'link'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <LinkIcon className="w-5 h-5" />
                  <span>Link</span>
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] font-medium transition-colors duration-200"
            >
              {(isSubmitting || isUploading) ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>
                  {isProjectPost ? 'Create Project' : 'Post'}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}