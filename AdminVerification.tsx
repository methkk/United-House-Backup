import React from 'react';
import { Shield, AlertCircle, Check, X, ChevronLeft, ChevronRight, Search, MapPin, FileText, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ImageModal } from '../components/ImageModal';

interface VerificationRequest {
  id: string;
  username: string;
  first_name: string;
  surname: string;
  verification_status: string;
  created_at: string;
  location_country: string | null;
  location_city: string | null;
  location_town: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  verification_rejection_reason?: string | null;
}

export function AdminVerification() {
  const [requests, setRequests] = React.useState<VerificationRequest[]>([]);
  const [approvedUsers, setApprovedUsers] = React.useState<VerificationRequest[]>([]);
  const [rejectedUsers, setRejectedUsers] = React.useState<VerificationRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [approvedLoading, setApprovedLoading] = React.useState(false);
  const [rejectedLoading, setRejectedLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [showRejectionModal, setShowRejectionModal] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [approvedPage, setApprovedPage] = React.useState(1);
  const [rejectedPage, setRejectedPage] = React.useState(1);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showDocumentModal, setShowDocumentModal] = React.useState(false);
  const [selectedDocument, setSelectedDocument] = React.useState<string | null>(null);
  const [documentType, setDocumentType] = React.useState<'id' | 'selfie' | null>(null);
  const [documentLoading, setDocumentLoading] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [processingRequest, setProcessingRequest] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'pending' | 'approved' | 'rejected'>('pending');
  const [lastRefresh, setLastRefresh] = React.useState(Date.now());
  const itemsPerPage = 10;

  React.useEffect(() => {
    checkAdminStatus();
  }, []);

  React.useEffect(() => {
    if (isAdmin === true) {
      refreshAllData();
    }
  }, [currentPage, approvedPage, rejectedPage, searchQuery, isAdmin, lastRefresh]);

  React.useEffect(() => {
    if (isAdmin === true) {
      // Refresh data when switching tabs
      refreshCurrentTabData();
    }
  }, [activeTab]);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to access this page');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check if user is admin by profile username only (avoid auth.users table)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to verify admin status');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const isFounder = profile?.username === 'The_Founder';
      setIsAdmin(isFounder);

      if (!isFounder) {
        setError('Access denied. Only administrators can view this page.');
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setError('Failed to verify admin status');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    console.log('Refreshing all verification data...');
    await Promise.all([
      fetchVerificationRequests(),
      fetchApprovedUsers(),
      fetchRejectedUsers()
    ]);
  };

  const refreshCurrentTabData = async () => {
    switch (activeTab) {
      case 'pending':
        await fetchVerificationRequests();
        break;
      case 'approved':
        await fetchApprovedUsers();
        break;
      case 'rejected':
        await fetchRejectedUsers();
        break;
    }
  };

  const fetchVerificationRequests = async () => {
    if (isAdmin !== true) return;

    try {
      setError(null);
      if (activeTab === 'pending') {
        setLoading(true);
      }

      let query = supabase
        .from('profiles')
        .select('id, username, first_name, surname, verification_status, created_at, location_country, location_city, location_town, location_latitude, location_longitude')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,surname.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (error) throw error;
      console.log('Fetched pending requests:', data?.length || 0);
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching verification requests:', err);
      setError('Failed to load verification requests');
    } finally {
      if (activeTab === 'pending') {
        setLoading(false);
      }
    }
  };

  const fetchApprovedUsers = async () => {
    if (isAdmin !== true) return;

    try {
      if (activeTab === 'approved') {
        setApprovedLoading(true);
      }

      let query = supabase
        .from('profiles')
        .select('id, username, first_name, surname, verification_status, created_at, location_country, location_city, location_town, location_latitude, location_longitude')
        .eq('verification_status', 'verified')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,surname.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .range((approvedPage - 1) * itemsPerPage, approvedPage * itemsPerPage - 1);

      if (error) throw error;
      console.log('Fetched approved users:', data?.length || 0);
      setApprovedUsers(data || []);
    } catch (err) {
      console.error('Error fetching approved users:', err);
    } finally {
      if (activeTab === 'approved') {
        setApprovedLoading(false);
      }
    }
  };

  const fetchRejectedUsers = async () => {
    if (isAdmin !== true) return;

    try {
      if (activeTab === 'rejected') {
        setRejectedLoading(true);
      }

      let query = supabase
        .from('profiles')
        .select('id, username, first_name, surname, verification_status, created_at, location_country, location_city, location_town, location_latitude, location_longitude, verification_rejection_reason')
        .eq('verification_status', 'rejected')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`username.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,surname.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query
        .range((rejectedPage - 1) * itemsPerPage, rejectedPage * itemsPerPage - 1);

      if (error) throw error;
      console.log('Fetched rejected users:', data?.length || 0);
      setRejectedUsers(data || []);
    } catch (err) {
      console.error('Error fetching rejected users:', err);
    } finally {
      if (activeTab === 'rejected') {
        setRejectedLoading(false);
      }
    }
  };

  const handleViewDocument = async (userId: string, type: 'id' | 'selfie') => {
    try {
      setDocumentLoading(true);
      
      // List files in the user's directory
      const { data: files, error: listError } = await supabase.storage
        .from('identity-verification')
        .list(userId);

      if (listError) {
        console.error('Storage list error:', listError);
        throw new Error(`Failed to access verification documents: ${listError.message}`);
      }

      if (!files || files.length === 0) {
        throw new Error(`No verification documents found for this user`);
      }

      // Find the specific document based on type
      const document = files.find(file => {
        const fileName = file.name.toLowerCase();
        if (type === 'id') {
          return fileName.includes('id') && !fileName.includes('selfie');
        } else {
          return fileName.includes('selfie');
        }
      });

      if (!document) {
        throw new Error(`No ${type} document found for this user`);
      }

      // Create a signed URL for secure access
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('identity-verification')
        .createSignedUrl(`${userId}/${document.name}`, 3600); // 1 hour expiry

      if (signedUrlError) {
        console.error('Signed URL error:', signedUrlError);
        throw new Error(`Failed to create secure access URL: ${signedUrlError.message}`);
      }

      if (!signedUrlData?.signedUrl) {
        throw new Error('Failed to generate document access URL');
      }

      setSelectedDocument(signedUrlData.signedUrl);
      setDocumentType(type);
      setShowDocumentModal(true);
    } catch (err) {
      console.error('Error fetching document:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load document';
      alert(errorMessage);
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (processingRequest) return; // Prevent multiple simultaneous requests
    
    try {
      setProcessingRequest(id);
      console.log('Approving verification for user:', id);
      
      // Use a more direct approach to update the profile
      const { error } = await supabase
        .from('profiles')
        .update({ 
          verification_status: 'verified',
          verification_rejection_reason: null // Clear any previous rejection reason
        })
        .eq('id', id);

      if (error) {
        console.error('Error approving verification:', error);
        
        // Provide more specific error messages
        if (error.code === '42501') {
          throw new Error('Permission denied. Please ensure you have admin privileges.');
        } else if (error.code === '23514') {
          throw new Error('Invalid verification status value.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      console.log('Verification approved successfully for user:', id);
      
      // Show success message
      alert('Verification approved successfully! The user will now see "Identity Verified" status.');
      
      // Force refresh all data to ensure consistency across tabs
      setLastRefresh(Date.now());
      
      // If this was the last item on the current page, go to previous page
      if (requests.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      console.error('Error approving verification:', err);
      alert(`Failed to approve verification: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim() || processingRequest) return;

    try {
      setProcessingRequest(selectedRequest);
      console.log('Rejecting verification for user:', selectedRequest);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'rejected',
          verification_rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedRequest);

      if (error) {
        console.error('Error rejecting verification:', error);
        
        // Provide more specific error messages
        if (error.code === '42501') {
          throw new Error('Permission denied. Please ensure you have admin privileges.');
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }

      console.log('Verification rejected successfully for user:', selectedRequest);
      
      // Show success message
      alert('Verification rejected successfully! The user will see the rejection reason.');
      
      // Close modal and reset state
      setShowRejectionModal(false);
      setRejectionReason('');
      setSelectedRequest(null);
      
      // Force refresh all data to ensure consistency across tabs
      setLastRefresh(Date.now());
      
      // If this was the last item on the current page, go to previous page
      if (requests.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      console.error('Error rejecting verification:', err);
      alert(`Failed to reject verification: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleTabChange = (tab: 'pending' | 'approved' | 'rejected') => {
    setActiveTab(tab);
    // Reset search when switching tabs
    setSearchQuery('');
    // Reset to first page when switching tabs
    setCurrentPage(1);
    setApprovedPage(1);
    setRejectedPage(1);
  };

  const renderUserTable = (users: VerificationRequest[], isLoading: boolean, showActions: boolean = false, showRejectionReason: boolean = false) => (
    <div className="overflow-x-auto">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              {showRejectionReason && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejection Reason</th>
              )}
              {showActions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">{user.username[0].toUpperCase()}</span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">@{user.username}</div>
                      <div className="text-sm text-gray-500">{user.first_name} {user.surname}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-900">{user.location_country}</div>
                      <div className="text-sm text-gray-500">{user.location_city}, {user.location_town}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewDocument(user.id, 'id')}
                      disabled={documentLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      ID Document
                    </button>
                    <button
                      onClick={() => handleViewDocument(user.id, 'selfie')}
                      disabled={documentLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4 mr-1" />
                      Selfie
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(user.created_at), 'MMM d, yyyy HH:mm')}
                </td>
                {showRejectionReason && (
                  <td className="px-6 py-4">
                    <div className="text-sm text-red-600 max-w-xs">
                      {user.verification_rejection_reason || 'No reason provided'}
                    </div>
                  </td>
                )}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={processingRequest === user.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {processingRequest === user.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(user.id);
                        setShowRejectionModal(true);
                      }}
                      disabled={processingRequest === user.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={showActions ? 5 : (showRejectionReason ? 5 : 4)} className="px-6 py-4 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderPagination = (currentPageState: number, setCurrentPageState: (page: number) => void, dataLength: number) => (
    <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setCurrentPageState(Math.max(1, currentPageState - 1))}
            disabled={currentPageState === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPageState(currentPageState + 1)}
            disabled={dataLength < itemsPerPage}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPageState}</span>
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => setCurrentPageState(Math.max(1, currentPageState - 1))}
                disabled={currentPageState === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCurrentPageState(currentPageState + 1)}
                disabled={dataLength < itemsPerPage}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading while checking admin status
  if (isAdmin === null || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show access denied if not admin
  if (isAdmin === false) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error || 'Access denied. Only administrators can view this page.'}</p>
        </div>
      </div>
    );
  }

  if (error && isAdmin === true) {
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
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Requests ({requests.length})
            </button>
            <button
              onClick={() => handleTabChange('approved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'approved'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Approved Users ({approvedUsers.length})
            </button>
            <button
              onClick={() => handleTabChange('rejected')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rejected'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rejected Users ({rejectedUsers.length})
            </button>
          </nav>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              {activeTab === 'pending' && 'Pending Verification Requests'}
              {activeTab === 'approved' && 'Approved Users'}
              {activeTab === 'rejected' && 'Rejected Users'}
            </h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setLastRefresh(Date.now())}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Refresh
              </button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'pending' && (
          <>
            {renderUserTable(requests, loading, true)}
            {renderPagination(currentPage, setCurrentPage, requests.length)}
          </>
        )}

        {activeTab === 'approved' && (
          <>
            {renderUserTable(approvedUsers, approvedLoading)}
            {renderPagination(approvedPage, setApprovedPage, approvedUsers.length)}
          </>
        )}

        {activeTab === 'rejected' && (
          <>
            {renderUserTable(rejectedUsers, rejectedLoading, false, true)}
            {renderPagination(rejectedPage, setRejectedPage, rejectedUsers.length)}
          </>
        )}
      </div>

      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Verification</h3>
            <div className="mb-4">
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection
              </label>
              <textarea
                id="rejectionReason"
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a reason for rejecting this verification request..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                disabled={processingRequest !== null}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || processingRequest !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                {processingRequest === selectedRequest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Verification'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageModal
        isOpen={showDocumentModal}
        imageUrl={selectedDocument || ''}
        onClose={() => {
          setShowDocumentModal(false);
          setSelectedDocument(null);
          setDocumentType(null);
        }}
      />
    </div>
  );
}