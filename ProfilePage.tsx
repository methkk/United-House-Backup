import React from 'react';
import { Shield, Mail, Calendar, User as UserIcon, Camera, Loader2, FileText, Clock, AlertCircle, RefreshCw, MessageSquare, Users, Edit2, Check, X, MapPin, ClipboardList, PlusCircle, CheckCircle, XCircle, ChevronDown, ChevronUp, MoreVertical, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ImageCropModal } from '../components/ImageCropModal';
import { CameraModal } from '../components/CameraModal';
import { LocationDetection } from '../components/LocationDetection';
import { Link } from 'react-router-dom';
import { SupporterRequests } from '../components/SupporterRequests';

interface Profile {
  username: string;
  first_name: string;
  surname: string;
  date_of_birth: string;
  official: boolean;
  created_at: string;
  avatar_url: string | null;
  verification_status: 'pending' | 'verified' | 'rejected' | null;
  verification_rejection_reason?: string | null;
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

interface UserCommunity {
  id: string;
  name: string;
  member_count: number;
  created_at: string;
}

interface LocationData {
  constituency: string;
  postcode: string;
  country: string;
  region: string;
  admin_district: string;
  admin_county: string;
  latitude: number;
  longitude: number;
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

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [showCropModal, setShowCropModal] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = React.useState(false);
  const [showStatusModal, setShowStatusModal] = React.useState(false);
  const [verificationStep, setVerificationStep] = React.useState(1);
  const [idType, setIdType] = React.useState('passport');
  const [idNumber, setIdNumber] = React.useState('');
  const [idImage, setIdImage] = React.useState<File | null>(null);
  const [showCamera, setShowCamera] = React.useState(false);
  const [selfieImage, setSelfieImage] = React.useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = React.useState<string | null>(null);
  const [locationData, setLocationData] = React.useState<LocationData | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const idFileInputRef = React.useRef<HTMLInputElement>(null);
  const [posts, setPosts] = React.useState<UserPost[]>([]);
  const [communities, setCommunities] = React.useState<UserCommunity[]>([]);
  const [activityLoading, setActivityLoading] = React.useState(true);
  const [editingUsername, setEditingUsername] = React.useState(false);
  const [newUsername, setNewUsername] = React.useState('');
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [savingUsername, setSavingUsername] = React.useState(false);
  
  // Actions state
  const [actions, setActions] = React.useState<UserAction[]>([]);
  const [showActionModal, setShowActionModal] = React.useState(false);
  const [actionTitle, setActionTitle] = React.useState('');
  const [actionDescription, setActionDescription] = React.useState('');
  const [actionStatus, setActionStatus] = React.useState<'planned' | 'in_progress' | 'completed' | 'cancelled'>('planned');
  const [actionProgress, setActionProgress] = React.useState(0);
  const [savingAction, setSavingAction] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = React.useState<string | null>(null);
  const [completionDate, setCompletionDate] = React.useState<string>('');
  const [showAllActions, setShowAllActions] = React.useState(false);
  
  // Action updates state
  const [actionUpdates, setActionUpdates] = React.useState<{[key: string]: ActionUpdate[]}>({});
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);
  const [selectedActionId, setSelectedActionId] = React.useState<string | null>(null);
  const [updateContent, setUpdateContent] = React.useState('');
  const [savingUpdate, setSavingUpdate] = React.useState(false);
  const [showUpdates, setShowUpdates] = React.useState<{[key: string]: boolean}>({});

  React.useEffect(() => {
    fetchProfile();
  }, []);

  React.useEffect(() => {
    if (profile) {
      fetchUserActivity();
      fetchUserActions();
    }
  }, [profile]);

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch communities created by user
      const { data: communitiesData, error: communitiesError } = await supabase
        .from('communities')
        .select('id, name, member_count, created_at')
        .eq('creator_id', session.user.id)
        .order('created_at', { ascending: false });

      if (communitiesError) throw communitiesError;

      setPosts(postsData || []);
      setCommunities(communitiesData || []);
    } catch (err) {
      console.error('Error fetching user activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserActions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('user_actions')
        .select('*')
        .eq('user_id', session.user.id)
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

  const fetchProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleIdImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIdImage(file);
    }
  };

  const handleSelfieCapture = (file: File) => {
    setSelfieImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfiePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLocationDetected = (data: LocationData) => {
    setLocationData(data);
    setLocationError(null);
  };

  const handleLocationError = (error: string) => {
    setLocationError(error);
    setLocationData(null);
  };

  const handleNextStep = () => {
    if (!idNumber || !idImage || !selfieImage) {
      alert('Please complete all fields before proceeding');
      return;
    }
    setVerificationStep(2);
  };

  const handlePrevStep = () => {
    setVerificationStep(1);
  };

  const handleVerificationSubmit = async () => {
    try {
      setUploading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      if (!idImage || !selfieImage || !locationData) {
        throw new Error('Please provide all required information');
      }

      // Upload ID document
      const idFileName = `${session.user.id}/id-${Date.now()}.jpg`;
      const { error: idUploadError } = await supabase.storage
        .from('identity-verification')
        .upload(idFileName, idImage);

      if (idUploadError) throw idUploadError;

      // Upload selfie
      const selfieFileName = `${session.user.id}/selfie-${Date.now()}.jpg`;
      const { error: selfieUploadError } = await supabase.storage
        .from('identity-verification')
        .upload(selfieFileName, selfieImage);

      if (selfieUploadError) throw selfieUploadError;

      // Update profile with verification status and location data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          location_country: locationData.country,
          location_city: locationData.admin_district,
          location_town: locationData.admin_county,
          constituency: locationData.constituency,
          postcode: locationData.postcode,
          location_latitude: locationData.latitude,
          location_longitude: locationData.longitude
        })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // Reset form and close modal
      setIdType('passport');
      setIdNumber('');
      setIdImage(null);
      setSelfieImage(null);
      setSelfiePreview(null);
      setLocationData(null);
      setShowVerificationModal(false);
      setVerificationStep(1);

      // Refresh profile to show updated status
      await fetchProfile();
    } catch (err) {
      console.error('Error uploading verification documents:', err);
      alert('Error uploading verification documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    try {
      setUploading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create a unique file name
      const fileName = `${session.user.id}/${Date.now()}.jpg`;

      // Upload the cropped image
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, croppedImage, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // Refresh the profile data
      await fetchProfile();
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Error uploading image. Please try again.');
    } finally {
      setUploading(false);
      setSelectedImage(null);
    }
  };

  const handleUsernameEdit = async () => {
    if (!profile) return;
    setNewUsername(profile.username);
    setEditingUsername(true);
    setUsernameError(null);
  };

  const handleUsernameSave = async () => {
    try {
      setSavingUsername(true);
      setUsernameError(null);

      if (!newUsername.trim()) {
        setUsernameError('Username cannot be empty');
        return;
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername)
        .neq('id', profile?.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        setUsernameError('Username is already taken');
        return;
      }

      // Update username
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      // Refresh profile data
      await fetchProfile();
      setEditingUsername(false);
    } catch (err) {
      console.error('Error updating username:', err);
      setUsernameError('Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  const handleCreateAction = async () => {
    try {
      setSavingAction(true);
      
      if (!actionTitle.trim() || !actionDescription.trim()) {
        alert('Please fill in all required fields');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const actionData: any = {
        user_id: session.user.id,
        title: actionTitle.trim(),
        description: actionDescription.trim(),
        status: actionStatus,
        progress: actionStatus === 'in_progress' ? actionProgress : 0
      };
      
      if (actionStatus === 'completed' && completionDate) {
        actionData.completion_date = completionDate;
      }
      
      if (editingAction) {
        // Update existing action
        const { error } = await supabase
          .from('user_actions')
          .update(actionData)
          .eq('id', editingAction);
          
        if (error) throw error;
      } else {
        // Create new action
        const { error } = await supabase
          .from('user_actions')
          .insert([actionData]);
          
        if (error) throw error;
      }
      
      // Reset form and close modal
      setActionTitle('');
      setActionDescription('');
      setActionStatus('planned');
      setActionProgress(0);
      setCompletionDate('');
      setEditingAction(null);
      setShowActionModal(false);
      
      // Refresh actions
      await fetchUserActions();
    } catch (err) {
      console.error('Error saving action:', err);
      alert('Error saving action. Please try again.');
    } finally {
      setSavingAction(false);
    }
  };
  
  const handleEditAction = (action: UserAction) => {
    setEditingAction(action.id);
    setActionTitle(action.title);
    setActionDescription(action.description);
    setActionStatus(action.status);
    setActionProgress(action.progress || 0);
    setCompletionDate(action.completion_date ? new Date(action.completion_date).toISOString().split('T')[0] : '');
    setShowActionModal(true);
    setShowActionMenu(null);
  };
  
  const handleDeleteAction = async (actionId: string) => {
    if (!window.confirm('Are you sure you want to delete this action?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_actions')
        .delete()
        .eq('id', actionId);
        
      if (error) throw error;
      
      // Refresh actions
      await fetchUserActions();
      setShowActionMenu(null);
    } catch (err) {
      console.error('Error deleting action:', err);
      alert('Error deleting action. Please try again.');
    }
  };
  
  const handleAddUpdate = (actionId: string) => {
    setSelectedActionId(actionId);
    setUpdateContent('');
    setShowUpdateModal(true);
    setShowActionMenu(null);
  };
  
  const handleSaveUpdate = async () => {
    try {
      setSavingUpdate(true);
      
      if (!updateContent.trim() || !selectedActionId) {
        alert('Please enter an update');
        return;
      }
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('action_updates')
        .insert([{
          action_id: selectedActionId,
          content: updateContent.trim(),
          user_id: session.user.id
        }]);
        
      if (error) throw error;
      
      // Reset form and close modal
      setUpdateContent('');
      setSelectedActionId(null);
      setShowUpdateModal(false);
      
      // Refresh action updates
      await fetchActionUpdates([selectedActionId]);
      
      // Show updates for this action
      setShowUpdates(prev => ({
        ...prev,
        [selectedActionId]: true
      }));
    } catch (err) {
      console.error('Error saving update:', err);
      alert('Error saving update. Please try again.');
    } finally {
      setSavingUpdate(false);
    }
  };
  
  const toggleShowUpdates = (actionId: string) => {
    setShowUpdates(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  const getVerificationStatusDisplay = () => {
    if (!profile) return null;

    switch (profile.verification_status) {
      case 'pending':
        return (
          <button
            onClick={() => setShowStatusModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 transition-colors"
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending Review
          </button>
        );
      case 'verified':
        return (
          <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100">
            <Shield className="w-4 h-4 mr-2" />
            Identity Verified
          </div>
        );
      case 'rejected':
        return (
          <div className="space-y-2">
            <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100">
              <AlertCircle className="w-4 h-4 mr-2" />
              Verification Rejected
            </div>
            {profile.verification_rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">
                  <strong>Reason:</strong> {profile.verification_rejection_reason}
                </p>
              </div>
            )}
            <button
              onClick={() => setShowVerificationModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        );
      default:
        return (
          <button
            onClick={() => setShowVerificationModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Shield className="w-4 h-4 mr-2" />
            Verify Identity
          </button>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planned':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Planned
          </span>
        );
      case 'in_progress':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Cancelled
          </span>
        );
      default:
        return null;
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
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">Profile not found</p>
        </div>
      </div>
    );
  }

  const displayedActions = showAllActions ? actions : actions.slice(0, 5);
  const hasMoreActions = actions.length > 5;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="bg-blue-600 px-6 py-8">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-blue-600 text-4xl font-bold">
                  {profile.username[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
            <div className="text-white">
              <div className="flex items-center space-x-2">
                {editingUsername ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="px-2 py-1 rounded text-gray-900 text-lg"
                      placeholder="Enter new username"
                      disabled={savingUsername}
                    />
                    <button
                      onClick={handleUsernameSave}
                      disabled={savingUsername}
                      className="p-1 bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {savingUsername ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingUsername(false)}
                      disabled={savingUsername}
                      className="p-1 bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">@{profile.username}</h1>
                    <button
                      onClick={handleUsernameEdit}
                      className="p-1 hover:bg-blue-500 rounded transition-colors"
                      title="Edit username"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {profile.official && (
                  <Shield className="w-6 h-6 text-white" />
                )}
              </div>
              {usernameError && (
                <p className="text-red-200 text-sm mt-1">{usernameError}</p>
              )}
              <p className="text-blue-100 mt-1">
                {profile.first_name} {profile.surname}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{profile.first_name} {profile.surname}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Username</p>
                  <p className="font-medium">@{profile.username}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Date of Birth</p>
                  <p className="font-medium">
                    {format(new Date(profile.date_of_birth), 'MMMM d, yyyy')}
                  </p>
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

              {profile.postcode && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Postcode</p>
                    <p className="font-medium">{profile.postcode}</p>
                  </div>
                </div>
              )}
            </div>

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

              <div>
                <h3 className="text-lg font-semibold mb-2">Member Since</h3>
                <p className="text-gray-600">
                  {format(new Date(profile.created_at), 'MMMM d, yyyy')}
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Identity Verification</h3>
                {getVerificationStatusDisplay()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.official && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="p-6">
            <SupporterRequests />
          </div>
        </div>
      )}

      {/* Actions Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-blue-600" />
              Actions
            </h2>
            <button
              onClick={() => {
                setActionTitle('');
                setActionDescription('');
                setActionStatus('planned');
                setActionProgress(0);
                setCompletionDate('');
                setEditingAction(null);
                setShowActionModal(true);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="w-4 h-4 mr-1" />
              Add Action
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-medium">No actions yet</p>
              <p className="text-sm">Add actions to track your progress and keep your constituents informed.</p>
            </div>
          ) : (
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
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowActionMenu(showActionMenu === action.id ? null : action.id)}
                        className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {showActionMenu === action.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditAction(action)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Edit2 className="w-4 h-4 inline mr-2" />
                              Edit Action
                            </button>
                            <button
                              onClick={() => handleAddUpdate(action.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Plus className="w-4 h-4 inline mr-2" />
                              Add Update
                            </button>
                            <button
                              onClick={() => handleDeleteAction(action.id)}
                              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 inline mr-2" />
                              Delete Action
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
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
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">My Activity</h2>

          {activityLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Communities Created
                </h3>
                {communities.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {communities.map((community) => (
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
                ) : (
                  <p className="text-gray-500">No communities created yet</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
                  Posts Created
                </h3>
                {posts.length > 0 ? (
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
                        <h4 className="font-medium text-gray-900">{post.title}</h4>
                        <p className="text-gray-600 mt-2 line-clamp-2">{post.content}</p>
                        <div className="flex items-center text-sm text-gray-500 mt-2">
                          <span>{post.score} points</span>
                          <span className="mx-2">•</span>
                          <span>{format(new Date(post.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No posts created yet</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingAction ? 'Edit Action' : 'Add New Action'}
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="actionTitle" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="actionTitle"
                  value={actionTitle}
                  onChange={(e) => setActionTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter action title"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="actionDescription" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="actionDescription"
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the action"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="actionStatus" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="actionStatus"
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              {actionStatus === 'in_progress' && (
                <div>
                  <label htmlFor="actionProgress" className="block text-sm font-medium text-gray-700 mb-1">
                    Progress ({actionProgress}%)
                  </label>
                  <input
                    type="range"
                    id="actionProgress"
                    min="0"
                    max="100"
                    step="5"
                    value={actionProgress}
                    onChange={(e) => setActionProgress(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              {actionStatus === 'completed' && (
                <div>
                  <label htmlFor="completionDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    id="completionDate"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAction}
                disabled={savingAction || !actionTitle.trim() || !actionDescription.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {savingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingAction ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Update Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add Progress Update
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="updateContent" className="block text-sm font-medium text-gray-700 mb-1">
                  Update Details
                </label>
                <textarea
                  id="updateContent"
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the progress update"
                  required
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUpdate}
                disabled={savingUpdate || !updateContent.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {savingUpdate ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Add Update'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleSelfieCapture}
      />

      <ImageCropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedImage(null);
        }}
        imageUrl={selectedImage || ''}
        onCropComplete={handleCropComplete}
      />

      {showCropModal && selectedImage && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={() => {
            setShowCropModal(false);
            setSelectedImage(null);
          }}
          imageUrl={selectedImage}
          onCropComplete={handleCropComplete}
        />
      )}

      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4">
              {profile.verification_status === 'pending' ? (
                <Clock className="w-12 h-12 text-yellow-500" />
              ) : profile.verification_status === 'rejected' ? (
                <AlertCircle className="w-12 h-12 text-red-500" />
              ) : (
                <Shield className="w-12 h-12 text-green-500" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-center mb-2">
              {profile.verification_status === 'pending'
                ? 'Verification In Progress'
                : profile.verification_status === 'rejected'
                ? 'Verification Rejected'
                : 'Verification Complete'}
            </h3>
            <p className="text-gray-600 text-center">
              {profile.verification_status === 'pending'
                ? 'Your Identity Verification is being reviewed by the United-House Team'
                : profile.verification_status === 'rejected'
                ? profile.verification_rejection_reason || 'Your verification request was rejected. Please try again with valid documents.'
                : 'Your identity has been verified successfully.'}
            </p>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">
                {verificationStep === 1 ? 'Identity Verification' : 'Confirm Residential Location'}
              </h2>
              <button
                onClick={() => {
                  setShowVerificationModal(false);
                  setVerificationStep(1);
                  setIdType('passport');
                  setIdNumber('');
                  setIdImage(null);
                  setSelfieImage(null);
                  setSelfiePreview(null);
                  setLocationData(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              {verificationStep === 1 ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="idType" className="block text-sm font-medium text-gray-700">
                      ID Type
                    </label>
                    <select
                      id="idType"
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                    >
                      <option value="passport">Passport</option>
                      <option value="drivers_license">Driver's License</option>
                      <option value="national_id">National ID</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700">
                      ID Number
                    </label>
                    <input
                      type="text"
                      id="idNumber"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload ID Document
                    </label>
                    <div 
                      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${idImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300 border-dashed'} rounded-lg hover:border-blue-400 transition-colors cursor-pointer`}
                      onClick={() => idFileInputRef.current?.click()}
                    >
                      <div className="space-y-2 text-center">
                        <FileText className={`mx-auto h-12 w-12 ${idImage ? 'text-blue-500' : 'text-gray-400'}`} />
                        <div className="flex text-sm">
                          <label className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                            <span>Upload a file</span>
                            <input
                              ref={idFileInputRef}
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleIdImageSelect}
                            />
                          </label>
                          <p className="pl-1 text-gray-500">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG up to 10MB
                        </p>
                        {idImage && (
                          <p className="text-sm text-blue-600">
                            {idImage.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Take a Selfie
                    </label>
                    <div 
                      className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${selfieImage ? 'border-blue-300 bg-blue-50' : 'border-gray-300 border-dashed'} rounded-lg hover:border-blue-400 transition-colors cursor-pointer`}
                      onClick={() => setShowCamera(true)}
                    >
                      <div className="space-y-2 text-center">
                        {selfiePreview ? (
                          <div className="relative inline-block">
                            <img
                              src={selfiePreview}
                              alt="Selfie preview"
                              className="h-32 w-32 object-cover rounded-full border-4 border-blue-100"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelfieImage(null);
                                setSelfiePreview(null);
                              }}
                              className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <Camera className={`mx-auto h-12 w-12 ${selfieImage ? 'text-blue-500' : 'text-gray-400'}`} />
                        )}
                        <div className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                          Take a photo
                        </div>
                        <p className="text-xs text-gray-500">
                          Make sure your face is clearly visible
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowVerificationModal(false);
                        setVerificationStep(1);
                        setIdType('passport');
                        setIdNumber('');
                        setIdImage(null);
                        setSelfieImage(null);
                        setSelfiePreview(null);
                        setLocationData(null);
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleNextStep}
                      disabled={!idNumber || !idImage || !selfieImage}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <LocationDetection
                    onLocationDetected={handleLocationDetected}
                    onError={handleLocationError}
                  />

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={handlePrevStep}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleVerificationSubmit}
                      disabled={!locationData || uploading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-2" />
                          Submit Verification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ProfilePage };