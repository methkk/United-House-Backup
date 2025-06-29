import React from 'react';
import { Shield, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface SupporterRequest {
  id: string;
  project_id: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  projects: {
    title: string;
    user_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  };
}

export function SupporterRequests() {
  const [requests, setRequests] = React.useState<SupporterRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = React.useState(false);
  const [selectedRequest, setSelectedRequest] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('project_supporters')
        .select(`
          id,
          project_id,
          status,
          rejection_reason,
          created_at,
          projects (
            title,
            user_id,
            profiles!user_id (
              username,
              avatar_url
            )
          )
        `)
        .eq('supporter_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching supporter requests:', err);
      setError('Failed to load supporter requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('project_supporters')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
      await fetchRequests();
    } catch (err) {
      console.error('Error accepting request:', err);
      alert('Failed to accept request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('project_supporters')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason.trim()
        })
        .eq('id', selectedRequest);

      if (error) throw error;
      setShowRejectionModal(false);
      setSelectedRequest(null);
      setRejectionReason('');
      await fetchRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Support Requests</h2>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No support requests yet
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg shadow p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {request.projects.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      by @{request.projects.profiles.username}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Requested {formatDistanceToNow(new Date(request.created_at))} ago
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {request.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request.id);
                            setShowRejectionModal(true);
                          }}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                          request.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {request.status === 'accepted' ? 'Accepted' : 'Rejected'}
                      </span>
                    )}
                  </div>
                </div>
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="mt-3 bg-red-50 p-3 rounded-md">
                    <div className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      <p className="text-sm text-red-700">{request.rejection_reason}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Support Request</h3>
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
                placeholder="Please provide a reason for rejecting this support request..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}