import React from 'react';
import { X, Shield, Ban, AlertTriangle, BadgeCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  status: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    verification_status: string | null;
  };
}

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
  communityName?: string;
  onCommunityDeleted?: () => void;
}

export function MemberManagementModal({ 
  isOpen, 
  onClose, 
  communityId, 
  communityName = '',
  onCommunityDeleted 
}: MemberManagementModalProps) {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null);
  const [requiresVerification, setRequiresVerification] = React.useState(false);
  const [updatingSettings, setUpdatingSettings] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deletingCommunity, setDeletingCommunity] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchMembers();
      fetchCommunitySettings();
    }
  }, [isOpen, communityId]);

  const fetchCommunitySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('requires_verification')
        .eq('id', communityId)
        .single();

      if (error) throw error;
      setRequiresVerification(data.requires_verification);
    } catch (err) {
      console.error('Error fetching community settings:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          id,
          user_id,
          joined_at,
          status,
          profiles!user_id(username, avatar_url, verification_status)
        `)
        .eq('community_id', communityId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberStatus = async (memberId: string, newStatus: string) => {
    try {
      setUpdatingMemberId(memberId);
      const { error } = await supabase
        .from('community_members')
        .update({ status: newStatus })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.map(member => 
        member.id === memberId ? { ...member, status: newStatus } : member
      ));
    } catch (err) {
      console.error('Error updating member status:', err);
      alert('Failed to update member status');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleToggleVerificationRequirement = async () => {
    try {
      setUpdatingSettings(true);
      const { error } = await supabase
        .from('communities')
        .update({ requires_verification: !requiresVerification })
        .eq('id', communityId);

      if (error) throw error;
      setRequiresVerification(!requiresVerification);
    } catch (err) {
      console.error('Error updating community settings:', err);
      alert('Failed to update community settings');
    } finally {
      setUpdatingSettings(false);
    }
  };

  const handleDeleteCommunity = async () => {
    try {
      setDeletingCommunity(true);
      
      // First check if the community exists and user has permission
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to delete a community');
      }

      // Verify the user is the creator
      const { data: community, error: fetchError } = await supabase
        .from('communities')
        .select('creator_id, name')
        .eq('id', communityId)
        .single();

      if (fetchError) {
        throw new Error('Community not found or already deleted');
      }

      if (community.creator_id !== session.user.id) {
        throw new Error('Only the community creator can delete this community');
      }

      // Delete the community (this will cascade to all related records)
      const { error: deleteError } = await supabase
        .from('communities')
        .delete()
        .eq('id', communityId)
        .eq('creator_id', session.user.id); // Double-check permission

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw new Error(`Failed to delete community: ${deleteError.message}`);
      }

      // Close modals and notify parent component
      setShowDeleteConfirm(false);
      onClose();
      
      // Call the callback to handle navigation
      if (onCommunityDeleted) {
        onCommunityDeleted();
      }
    } catch (err) {
      console.error('Error deleting community:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete community. Please try again.';
      alert(errorMessage);
    } finally {
      setDeletingCommunity(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.profiles.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Manage Community</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium mb-4">Community Settings</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Identity Verification</p>
                  <p className="text-sm text-gray-500">
                    Only verified users will be able to create posts in this community
                  </p>
                </div>
                <button
                  onClick={handleToggleVerificationRequirement}
                  disabled={updatingSettings}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    requiresVerification ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                      requiresVerification ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-medium mb-4">Members</h3>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error ? (
                <div className="bg-red-50 text-red-700 p-4 rounded-md">
                  {error}
                </div>
              ) : loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => (
                    <div key={member.id} className="py-4 flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {member.profiles.avatar_url ? (
                          <img
                            src={member.profiles.avatar_url}
                            alt={member.profiles.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {member.profiles.username[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">@{member.profiles.username}</p>
                            {member.profiles.verification_status === 'verified' && (
                              <BadgeCheck className="w-4 h-4 text-blue-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            Joined {format(new Date(member.joined_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {member.status === 'active' ? (
                          <>
                            <button
                              onClick={() => handleUpdateMemberStatus(member.id, 'restricted')}
                              disabled={updatingMemberId === member.id}
                              className="px-3 py-1 text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100 flex items-center space-x-1"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Restrict</span>
                            </button>
                            <button
                              onClick={() => handleUpdateMemberStatus(member.id, 'blocked')}
                              disabled={updatingMemberId === member.id}
                              className="px-3 py-1 text-red-700 bg-red-50 rounded-md hover:bg-red-100 flex items-center space-x-1"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Block</span>
                            </button>
                          </>
                        ) : member.status === 'restricted' ? (
                          <>
                            <button
                              onClick={() => handleUpdateMemberStatus(member.id, 'active')}
                              disabled={updatingMemberId === member.id}
                              className="px-3 py-1 text-green-700 bg-green-50 rounded-md hover:bg-green-100 flex items-center space-x-1"
                            >
                              <Shield className="w-4 h-4" />
                              <span>Activate</span>
                            </button>
                            <button
                              onClick={() => handleUpdateMemberStatus(member.id, 'blocked')}
                              disabled={updatingMemberId === member.id}
                              className="px-3 py-1 text-red-700 bg-red-50 rounded-md hover:bg-red-100 flex items-center space-x-1"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Block</span>
                            </button>
                          </>
                        ) : (
                          <span className="px-3 py-1 text-red-700 bg-red-50 rounded-md flex items-center space-x-1">
                            <Ban className="w-4 h-4" />
                            <span>Blocked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredMembers.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No members found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Delete Community Section - Moved to bottom */}
            <div className="p-4 border-t bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-700">Danger Zone</p>
                  <p className="text-sm text-gray-600">
                    Permanently delete this community and all its content. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deletingCommunity}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2 text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Community</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center mb-2">Delete Community</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete <strong>"{communityName}"</strong>? 
              <br /><br />
              This action will permanently delete:
              <br />• All posts and projects
              <br />• All comments and replies
              <br />• All member data
              <br />• All votes and interactions
              <br /><br />
              <strong>This cannot be undone.</strong>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingCommunity}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCommunity}
                disabled={deletingCommunity}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
              >
                {deletingCommunity ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Forever</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}