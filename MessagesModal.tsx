import React from 'react';
import { 
  X, 
  Send, 
  Paperclip, 
  Image, 
  Smile, 
  Search, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  ArrowLeft,
  Plus,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  Edit3,
  Reply,
  Forward,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  updated_at: string;
  message_type: string;
  file_url?: string;
  edited: boolean;
  deleted: boolean;
  sender: {
    username: string;
    avatar_url: string | null;
    official: boolean;
  };
  read_by?: string[];
}

interface Conversation {
  id: string;
  last_message_at: string;
  participants: {
    user_id: string;
    last_read_at: string;
    profiles: {
      username: string;
      avatar_url: string | null;
      official: boolean;
    };
  }[];
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
    message_type: string;
  };
  unread_count?: number;
}

interface MessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRecipientId?: string;
}

export function MessagesModal({ isOpen, onClose, initialRecipientId }: MessagesModalProps) {
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [newMessage, setNewMessage] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [showNewMessage, setShowNewMessage] = React.useState(false);
  const [selectedConversationData, setSelectedConversationData] = React.useState<Conversation | null>(null);
  const [showConversationInfo, setShowConversationInfo] = React.useState(false);
  const [editingMessage, setEditingMessage] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const [replyingTo, setReplyingTo] = React.useState<Message | null>(null);
  const [selectedMessages, setSelectedMessages] = React.useState<Set<string>>(new Set());
  const [showMessageActions, setShowMessageActions] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = React.useState<Set<string>>(new Set());
  
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (isOpen) {
      fetchCurrentUser();
      setupRealtimeSubscriptions();
    }
    return () => {
      cleanupSubscriptions();
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  React.useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      markAsRead();
      const convData = conversations.find(c => c.id === selectedConversation);
      setSelectedConversationData(convData || null);
    }
  }, [selectedConversation, conversations]);

  React.useEffect(() => {
    if (initialRecipientId && currentUser) {
      handleStartConversation(initialRecipientId);
    }
  }, [initialRecipientId, currentUser]);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing indicator effect
  React.useEffect(() => {
    if (newMessage.trim() && selectedConversation && !isTyping) {
      setIsTyping(true);
      sendTypingIndicator(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTypingIndicator(false);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, selectedConversation, isTyping]);

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new messages
    const messageSubscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          if (payload.new.conversation_id === selectedConversation) {
            fetchMessages();
          }
          fetchConversations(); // Update conversation list
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationSubscription = supabase
      .channel('conversations')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      messageSubscription.unsubscribe();
      conversationSubscription.unsubscribe();
    };
  };

  const cleanupSubscriptions = () => {
    supabase.removeAllChannels();
  };

  const sendTypingIndicator = async (typing: boolean) => {
    if (!selectedConversation || !currentUser) return;
    
    // In a real implementation, you'd send this to other participants
    // For now, we'll just update local state
  };

  const fetchCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUser(session?.user?.id || null);
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      console.log('Fetching conversations for user:', session.user.id);

      // Get conversations where the user is a participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          last_message_at,
          created_at,
          updated_at
        `)
        .order('last_message_at', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      console.log('All conversations:', conversationsData);

      // Filter conversations where the user is a participant and get participant details
      const conversationsWithDetails = await Promise.all(
        (conversationsData || []).map(async (conversation) => {
          console.log('Processing conversation:', conversation.id);

          // Get all participants for this conversation
          const { data: allParticipants, error: participantsError } = await supabase
            .from('conversation_participants')
            .select(`
              user_id,
              last_read_at,
              conversation_id
            `)
            .eq('conversation_id', conversation.id);

          if (participantsError) {
            console.error('Error fetching participants for conversation', conversation.id, ':', participantsError);
            return null;
          }

          // Check if current user is a participant
          const isUserParticipant = allParticipants?.some(p => p.user_id === session.user.id);
          if (!isUserParticipant) {
            return null; // Skip conversations where user is not a participant
          }

          console.log('All participants for conversation', conversation.id, ':', allParticipants);

          // Get profile data for other participants (not current user)
          const otherParticipantIds = (allParticipants || [])
            .filter(p => p.user_id !== session.user.id)
            .map(p => p.user_id);

          if (otherParticipantIds.length === 0) {
            return null; // Skip if no other participants
          }

          // Fetch profile data for other participants
          const { data: participantProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, official')
            .in('id', otherParticipantIds);

          if (profilesError) {
            console.error('Error fetching participant profiles:', profilesError);
            return null;
          }

          console.log('Participant profiles:', participantProfiles);

          // Map participants with their profile data
          const participantsWithProfiles = otherParticipantIds.map(participantId => {
            const participantData = allParticipants?.find(p => p.user_id === participantId);
            const profileData = participantProfiles?.find(p => p.id === participantId);

            return {
              user_id: participantId,
              last_read_at: participantData?.last_read_at || new Date().toISOString(),
              profiles: {
                username: profileData?.username || 'Unknown User',
                avatar_url: profileData?.avatar_url || null,
                official: profileData?.official || false
              }
            };
          });

          // Get the last message
          const { data: lastMessage, error: messageError } = await supabase
            .from('messages')
            .select('content, sender_id, created_at, message_type')
            .eq('conversation_id', conversation.id)
            .eq('deleted', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (messageError) {
            console.error('Error fetching last message:', messageError);
          }

          // Calculate unread count
          const currentUserParticipation = allParticipants?.find(p => p.user_id === session.user.id);
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .neq('sender_id', session.user.id)
            .gt('created_at', currentUserParticipation?.last_read_at || '1970-01-01');

          const conversationData = {
            id: conversation.id,
            last_message_at: conversation.last_message_at,
            participants: participantsWithProfiles,
            last_message: lastMessage || null,
            unread_count: unreadCount || 0
          };

          console.log('Final conversation data:', conversationData);
          return conversationData;
        })
      );

      const validConversations = conversationsWithDetails.filter(c => c !== null) as Conversation[];
      console.log('Valid conversations:', validConversations);
      setConversations(validConversations);
    } catch (err) {
      console.error('Error in fetchConversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedConversation) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (
            username,
            avatar_url,
            official
          )
        `)
        .eq('conversation_id', selectedConversation)
        .eq('deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markAsRead = async () => {
    if (!selectedConversation || !currentUser) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', selectedConversation)
        .eq('user_id', currentUser);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUser) return;

    try {
      setSending(true);
      
      let messageContent = newMessage.trim();
      let messageType = 'text';

      // Handle reply
      if (replyingTo) {
        messageContent = `@${replyingTo.sender.username}: ${messageContent}`;
        setReplyingTo(null);
      }

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: selectedConversation,
          sender_id: currentUser,
          content: messageContent,
          message_type: messageType
        }]);

      if (error) throw error;

      setNewMessage('');
      await Promise.all([fetchMessages(), fetchConversations()]);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: editContent.trim(),
          edited: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;

      setEditingMessage(null);
      setEditContent('');
      await fetchMessages();
    } catch (err) {
      console.error('Error editing message:', err);
      alert('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted: true })
        .eq('id', messageId);

      if (error) throw error;
      await fetchMessages();
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const handleStartConversation = async (recipientId: string) => {
    if (!currentUser) return;

    try {
      console.log('Starting conversation with recipient:', recipientId);

      // First, get the recipient's profile data
      const { data: recipientProfile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, official')
        .eq('id', recipientId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching recipient profile:', profileError);
        alert('Failed to find user profile');
        return;
      }

      if (!recipientProfile) {
        alert('User profile not found');
        return;
      }

      console.log('Recipient profile:', recipientProfile);

      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: currentUser,
        user2_id: recipientId
      });

      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }
      
      console.log('Created/found conversation:', data);
      
      setSelectedConversation(data);
      setShowNewMessage(false);
      
      // Create a temporary conversation data object for immediate display
      const tempConversationData: Conversation = {
        id: data,
        last_message_at: new Date().toISOString(),
        participants: [{
          user_id: recipientId,
          last_read_at: new Date().toISOString(),
          profiles: {
            username: recipientProfile.username,
            avatar_url: recipientProfile.avatar_url,
            official: recipientProfile.official || false
          }
        }],
        unread_count: 0
      };
      
      setSelectedConversationData(tempConversationData);
      
      // Fetch updated conversations list
      await fetchConversations();
    } catch (err) {
      console.error('Error starting conversation:', err);
      alert('Failed to start conversation');
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, official')
        .ilike('username', `%${query}%`)
        .neq('id', currentUser)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherParticipant = (conversation: Conversation) => {
    const participant = conversation.participants[0];
    if (!participant || !participant.profiles) {
      console.log('No participant or profile found for conversation:', conversation);
      return {
        username: 'Unknown User',
        avatar_url: null,
        official: false
      };
    }
    return participant.profiles;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getMessageStatus = (message: Message) => {
    if (message.sender_id !== currentUser) return null;
    
    // In a real implementation, you'd track read receipts
    return (
      <div className="flex items-center space-x-1 text-xs text-gray-400">
        <CheckCheck className="w-3 h-3" />
      </div>
    );
  };

  const renderMessage = (message: Message, index: number) => {
    const isOwn = message.sender_id === currentUser;
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !isOwn && (!prevMessage || prevMessage.sender_id !== message.sender_id);
    const showTimestamp = !prevMessage || 
      new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2 max-w-xs lg:max-w-md`}>
          {showAvatar && !isOwn && (
            <div className="flex-shrink-0">
              {message.sender.avatar_url ? (
                <img
                  src={message.sender.avatar_url}
                  alt={message.sender.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {message.sender.username[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
            {showTimestamp && (
              <div className="text-xs text-gray-500 mb-1 px-2">
                {formatMessageTime(message.created_at)}
              </div>
            )}
            
            <div
              className={`relative group px-4 py-2 rounded-2xl ${
                isOwn
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              } ${editingMessage === message.id ? 'ring-2 ring-blue-500' : ''}`}
              onDoubleClick={() => {
                if (isOwn && !editingMessage) {
                  setEditingMessage(message.id);
                  setEditContent(message.content);
                }
              }}
            >
              {editingMessage === message.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-transparent border-none resize-none focus:outline-none text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingMessage(null)}
                      className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditMessage(message.id)}
                      className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm break-words">{message.content}</p>
                  {message.edited && (
                    <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-gray-500'} italic`}>
                      edited
                    </span>
                  )}
                </>
              )}

              {/* Message actions */}
              <div className={`absolute ${isOwn ? 'left-0' : 'right-0'} top-0 transform ${isOwn ? '-translate-x-full' : 'translate-x-full'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <div className="flex items-center space-x-1 bg-white shadow-lg rounded-lg p-1">
                  <button
                    onClick={() => setReplyingTo(message)}
                    className="p-1 hover:bg-gray-100 rounded"
                    title="Reply"
                  >
                    <Reply className="w-4 h-4 text-gray-600" />
                  </button>
                  {isOwn && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMessage(message.id);
                          setEditContent(message.content);
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {isOwn && getMessageStatus(message)}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[80vh] flex overflow-hidden shadow-2xl">
        {/* Conversations List */}
        <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-1/3 border-r border-gray-200 flex-col`}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewMessage(true)}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  title="New Message"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium">No conversations yet</p>
                <p className="text-sm">Start a new conversation!</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const otherUser = getOtherParticipant(conversation);
                const isSelected = selectedConversation === conversation.id;
                
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                      isSelected ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        {otherUser?.avatar_url ? (
                          <img
                            src={otherUser.avatar_url}
                            alt={otherUser.username}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {otherUser?.username?.[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                        )}
                        {onlineUsers.has(otherUser?.username || '') && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            <p className="font-medium text-gray-900 truncate">
                              {otherUser?.username || 'Unknown User'}
                            </p>
                            {otherUser?.official && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {conversation.unread_count > 0 && (
                              <div className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                                {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                              </div>
                            )}
                            <span className="text-xs text-gray-400">
                              {formatMessageTime(conversation.last_message_at)}
                            </span>
                          </div>
                        </div>
                        
                        {conversation.last_message && (
                          <div className="flex items-center space-x-1 mt-1">
                            {conversation.last_message.sender_id === currentUser && (
                              <CheckCheck className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            )}
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.last_message.message_type === 'image' ? '📷 Photo' :
                               conversation.last_message.message_type === 'file' ? '📎 File' :
                               conversation.last_message.content}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
          {showNewMessage ? (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowNewMessage(false)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-semibold">New Message</h3>
                  </div>
                  <button
                    onClick={() => setShowNewMessage(false)}
                    className="hidden lg:block text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchUsers(e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {searchResults.map((user: any) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartConversation(user.id)}
                    className="w-full p-3 text-left hover:bg-gray-50 rounded-lg flex items-center space-x-3 transition-colors"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">@{user.username}</span>
                      {user.official && (
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No users found</p>
                    <p className="text-sm">Try searching with a different username</p>
                  </div>
                )}
              </div>
            </div>
          ) : selectedConversation && selectedConversationData ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedConversation(null)}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    
                    {(() => {
                      const otherUser = getOtherParticipant(selectedConversationData);
                      return (
                        <>
                          <div className="relative">
                            {otherUser?.avatar_url ? (
                              <img
                                src={otherUser.avatar_url}
                                alt={otherUser.username}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold">
                                  {otherUser?.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            {onlineUsers.has(otherUser?.username || '') && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold">{otherUser?.username || 'Unknown User'}</h3>
                              {otherUser?.official && (
                                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {onlineUsers.has(otherUser?.username || '') ? 'Online' : 'Last seen recently'}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                      <Video className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setShowConversationInfo(!showConversationInfo)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                      <Info className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map((message, index) => renderMessage(message, index))}
                    
                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                      <div className="flex justify-start mb-2">
                        <div className="bg-gray-200 rounded-2xl px-4 py-2">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply indicator */}
              {replyingTo && (
                <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Reply className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">
                        Replying to @{replyingTo.sender.username}
                      </span>
                      <span className="text-sm text-gray-500 truncate max-w-xs">
                        {replyingTo.content}
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                      <Image className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 relative">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Type a message..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
                      rows={1}
                      disabled={sending}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                    >
                      <Smile className="w-5 h-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx"
                  className="hidden"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8" />
                </div>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
              </div>
            </div>
          )}
        </div>

        {/* Conversation Info Sidebar */}
        {showConversationInfo && selectedConversationData && (
          <div className="w-80 border-l border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Conversation Info</h3>
              <button
                onClick={() => setShowConversationInfo(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {(() => {
              const otherUser = getOtherParticipant(selectedConversationData);
              return (
                <div className="space-y-6">
                  <div className="text-center">
                    {otherUser?.avatar_url ? (
                      <img
                        src={otherUser.avatar_url}
                        alt={otherUser.username}
                        className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-blue-600 font-semibold text-2xl">
                          {otherUser?.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <h4 className="font-semibold text-lg">{otherUser?.username || 'Unknown User'}</h4>
                    {otherUser?.official && (
                      <div className="flex items-center justify-center space-x-1 mt-1">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-sm text-blue-600">Official Account</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <button className="w-full p-3 bg-white rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-600" />
                      <span>Voice Call</span>
                    </button>
                    <button className="w-full p-3 bg-white rounded-lg hover:bg-gray-50 flex items-center space-x-3">
                      <Video className="w-5 h-5 text-gray-600" />
                      <span>Video Call</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <h5 className="font-medium text-gray-900">Privacy & Support</h5>
                    <button className="w-full p-3 bg-white rounded-lg hover:bg-gray-50 flex items-center space-x-3 text-red-600">
                      <Trash2 className="w-5 h-5" />
                      <span>Delete Conversation</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}