import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  Bell, 
  Eye, 
  Globe, 
  Smartphone, 
  Download, 
  Trash2, 
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Lock,
  Mail,
  MessageSquare,
  Heart,
  UserPlus,
  AlertTriangle,
  Settings as SettingsIcon,
  Camera,
  Palette,
  Languages,
  Volume2,
  VolumeX,
  Wifi,
  Database,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description?: string;
  type: 'toggle' | 'select' | 'action' | 'navigation';
  value?: boolean | string;
  options?: { label: string; value: string }[];
  action?: () => void;
  destructive?: boolean;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  // Settings state
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState({
    posts: true,
    comments: true,
    mentions: true,
    followers: true,
    email: false,
    push: true,
    sound: true
  });
  const [privacy, setPrivacy] = React.useState({
    profileVisibility: 'public',
    showEmail: false,
    showLocation: false,
    allowMessages: true
  });
  const [language, setLanguage] = React.useState('en');
  const [autoplay, setAutoplay] = React.useState(true);

  React.useEffect(() => {
    fetchUserData();
    loadSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        setProfile(profileData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));

    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications));

    const savedPrivacy = localStorage.getItem('privacy');
    if (savedPrivacy) setPrivacy(JSON.parse(savedPrivacy));

    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage) setLanguage(savedLanguage);

    const savedAutoplay = localStorage.getItem('autoplay');
    if (savedAutoplay) setAutoplay(JSON.parse(savedAutoplay));
  };

  const saveSettings = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const handleToggle = (section: string, key: string, value: boolean) => {
    if (section === 'notifications') {
      const updated = { ...notifications, [key]: value };
      setNotifications(updated);
      saveSettings('notifications', updated);
    } else if (section === 'privacy') {
      const updated = { ...privacy, [key]: value };
      setPrivacy(updated);
      saveSettings('privacy', updated);
    }
  };

  const handleSelect = (key: string, value: string) => {
    if (key === 'language') {
      setLanguage(value);
      saveSettings('language', value);
    } else if (key === 'profileVisibility') {
      const updated = { ...privacy, profileVisibility: value };
      setPrivacy(updated);
      saveSettings('privacy', updated);
    }
  };

  const handleDarkModeToggle = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    saveSettings('darkMode', newValue);
    // Apply dark mode class to document
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut();
      navigate('/');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      const confirmation = window.prompt('Type "DELETE" to confirm account deletion:');
      if (confirmation === 'DELETE') {
        try {
          // In a real app, you'd call an API to delete the account
          alert('Account deletion would be processed. This is a demo.');
        } catch (err) {
          alert('Failed to delete account. Please try again.');
        }
      }
    }
  };

  const downloadData = () => {
    // In a real app, this would generate and download user data
    alert('Your data download will be prepared and sent to your email within 24 hours.');
  };

  const settingsSections: SettingsSection[] = [
    {
      id: 'account',
      title: 'Account',
      icon: <User className="w-5 h-5" />,
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          description: 'Update your profile information',
          type: 'navigation',
          action: () => navigate('/profile')
        },
        {
          id: 'verification',
          title: 'Identity Verification',
          description: profile?.verification_status === 'verified' ? 'Verified' : 'Verify your identity',
          type: 'navigation',
          action: () => navigate('/profile')
        },
        {
          id: 'email',
          title: 'Email Address',
          description: user?.email,
          type: 'navigation'
        },
        {
          id: 'password',
          title: 'Change Password',
          description: 'Update your password',
          type: 'navigation'
        }
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Safety',
      icon: <Shield className="w-5 h-5" />,
      items: [
        {
          id: 'profileVisibility',
          title: 'Profile Visibility',
          description: 'Who can see your profile',
          type: 'select',
          value: privacy.profileVisibility,
          options: [
            { label: 'Public', value: 'public' },
            { label: 'Community Members Only', value: 'members' },
            { label: 'Private', value: 'private' }
          ]
        },
        {
          id: 'showEmail',
          title: 'Show Email',
          description: 'Display email on your profile',
          type: 'toggle',
          value: privacy.showEmail
        },
        {
          id: 'showLocation',
          title: 'Show Location',
          description: 'Display location on your profile',
          type: 'toggle',
          value: privacy.showLocation
        },
        {
          id: 'allowMessages',
          title: 'Allow Direct Messages',
          description: 'Let others send you messages',
          type: 'toggle',
          value: privacy.allowMessages
        },
        {
          id: 'blockedUsers',
          title: 'Blocked Users',
          description: 'Manage blocked accounts',
          type: 'navigation'
        }
      ]
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="w-5 h-5" />,
      items: [
        {
          id: 'posts',
          title: 'New Posts',
          description: 'Posts in communities you follow',
          type: 'toggle',
          value: notifications.posts
        },
        {
          id: 'comments',
          title: 'Comments',
          description: 'Comments on your posts',
          type: 'toggle',
          value: notifications.comments
        },
        {
          id: 'mentions',
          title: 'Mentions',
          description: 'When someone mentions you',
          type: 'toggle',
          value: notifications.mentions
        },
        {
          id: 'followers',
          title: 'New Followers',
          description: 'When someone follows you',
          type: 'toggle',
          value: notifications.followers
        },
        {
          id: 'email',
          title: 'Email Notifications',
          description: 'Receive notifications via email',
          type: 'toggle',
          value: notifications.email
        },
        {
          id: 'push',
          title: 'Push Notifications',
          description: 'Browser push notifications',
          type: 'toggle',
          value: notifications.push
        },
        {
          id: 'sound',
          title: 'Notification Sounds',
          description: 'Play sounds for notifications',
          type: 'toggle',
          value: notifications.sound
        }
      ]
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: <Palette className="w-5 h-5" />,
      items: [
        {
          id: 'darkMode',
          title: 'Dark Mode',
          description: 'Use dark theme',
          type: 'toggle',
          value: darkMode
        },
        {
          id: 'language',
          title: 'Language',
          description: 'Choose your language',
          type: 'select',
          value: language,
          options: [
            { label: 'English', value: 'en' },
            { label: 'Spanish', value: 'es' },
            { label: 'French', value: 'fr' },
            { label: 'German', value: 'de' },
            { label: 'Italian', value: 'it' }
          ]
        },
        {
          id: 'autoplay',
          title: 'Autoplay Videos',
          description: 'Automatically play videos',
          type: 'toggle',
          value: autoplay
        }
      ]
    },
    {
      id: 'data',
      title: 'Data & Storage',
      icon: <Database className="w-5 h-5" />,
      items: [
        {
          id: 'download',
          title: 'Download Your Data',
          description: 'Get a copy of your data',
          type: 'action',
          action: downloadData
        },
        {
          id: 'storage',
          title: 'Storage Usage',
          description: 'View storage usage',
          type: 'navigation'
        },
        {
          id: 'cache',
          title: 'Clear Cache',
          description: 'Clear app cache and data',
          type: 'action',
          action: () => {
            localStorage.clear();
            sessionStorage.clear();
            alert('Cache cleared successfully');
          }
        }
      ]
    },
    {
      id: 'support',
      title: 'Support',
      icon: <HelpCircle className="w-5 h-5" />,
      items: [
        {
          id: 'help',
          title: 'Help Center',
          description: 'Get help and support',
          type: 'navigation'
        },
        {
          id: 'feedback',
          title: 'Send Feedback',
          description: 'Share your thoughts',
          type: 'navigation'
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          description: 'Read our terms',
          type: 'navigation'
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          description: 'Read our privacy policy',
          type: 'navigation'
        },
        {
          id: 'about',
          title: 'About United-House',
          description: 'Learn more about us',
          type: 'navigation'
        }
      ]
    },
    {
      id: 'account-actions',
      title: 'Account Actions',
      icon: <AlertTriangle className="w-5 h-5" />,
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          description: 'Sign out of your account',
          type: 'action',
          action: handleLogout
        },
        {
          id: 'delete',
          title: 'Delete Account',
          description: 'Permanently delete your account',
          type: 'action',
          action: handleDeleteAccount,
          destructive: true
        }
      ]
    }
  ];

  const renderSettingItem = (item: SettingsItem, sectionId: string) => {
    switch (item.type) {
      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-500">{item.description}</p>
              )}
            </div>
            <button
              onClick={() => {
                if (item.id === 'darkMode') {
                  handleDarkModeToggle();
                } else if (item.id === 'autoplay') {
                  const newValue = !autoplay;
                  setAutoplay(newValue);
                  saveSettings('autoplay', newValue);
                } else {
                  handleToggle(sectionId, item.id, !item.value);
                }
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                item.value ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out ${
                  item.value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );

      case 'select':
        return (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-500">{item.description}</p>
              )}
            </div>
            <select
              value={item.value}
              onChange={(e) => handleSelect(item.id, e.target.value)}
              className="ml-4 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {item.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'action':
        return (
          <button
            onClick={item.action}
            className={`flex items-center justify-between w-full text-left ${
              item.destructive ? 'text-red-600 hover:text-red-700' : 'text-gray-900 hover:text-blue-600'
            } transition-colors`}
          >
            <div className="flex-1">
              <h4 className="font-medium">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-500">{item.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        );

      case 'navigation':
        return (
          <button
            onClick={item.action}
            className="flex items-center justify-between w-full text-left text-gray-900 hover:text-blue-600 transition-colors"
          >
            <div className="flex-1">
              <h4 className="font-medium">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-gray-500">{item.description}</p>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600">Manage your account and preferences</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingsSections.map((section) => (
          <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="text-blue-600">{section.icon}</div>
                <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {section.items.map((item) => (
                <div key={item.id} className="px-6 py-4">
                  {renderSettingItem(item, section.id)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>United-House v1.0.0</p>
        <p className="mt-1">
          Made with ❤️ for connecting communities with government
        </p>
      </div>
    </div>
  );
}