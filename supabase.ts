import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Get the current origin dynamically
const getCurrentOrigin = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR or when window is not available
  return 'https://united-house.com'; // Use your production domain as fallback
};

// Create Supabase client with proper redirect URL and custom email settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    autoRefreshToken: true
  }
});

// Helper function to get the correct redirect URL for auth operations
export const getAuthRedirectUrl = () => {
  const origin = getCurrentOrigin();
  console.log('Current origin for auth redirect:', origin);
  return `${origin}/login?confirmed=true`;
};

// Custom email configuration for better branding
export const getEmailConfig = () => {
  return {
    emailRedirectTo: getAuthRedirectUrl(),
    data: {
      site_name: 'United-House',
      site_url: getCurrentOrigin(),
      company_name: 'United-House',
      support_email: 'support@united-house.com'
    }
  };
};

// Enhanced signup function with custom branding
export const signUpWithCustomBranding = async (email: string, password: string, userData: any) => {
  const config = getEmailConfig();
  
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      ...config,
      data: {
        ...config.data,
        ...userData,
        // Add United-House specific metadata
        platform: 'United-House',
        welcome_message: 'Welcome to United-House - Connect with Government Officials & Communities'
      }
    }
  });
};

// Enhanced password reset with custom branding
export const resetPasswordWithCustomBranding = async (email: string) => {
  const config = getEmailConfig();
  
  return await supabase.auth.resetPasswordForEmail(email, {
    ...config,
    data: {
      ...config.data,
      reset_type: 'password_reset',
      instructions: 'You requested a password reset for your United-House account.'
    }
  });
};

// Enhanced email confirmation resend with custom branding
export const resendConfirmationWithCustomBranding = async (email: string) => {
  const config = getEmailConfig();
  
  return await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      ...config,
      data: {
        ...config.data,
        confirmation_type: 'email_confirmation',
        instructions: 'Please confirm your email address to complete your United-House account setup.'
      }
    }
  });
};

// Log the current configuration for debugging
console.log('Supabase configuration:', {
  url: supabaseUrl,
  origin: getCurrentOrigin(),
  redirectUrl: getAuthRedirectUrl()
});

// Function to handle email confirmation from any URL
export const handleEmailConfirmationFromAnyUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  
  // Check for confirmation parameters
  const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
  const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
  const type = urlParams.get('type') || hashParams.get('type');
  const error = urlParams.get('error') || hashParams.get('error');
  const code = urlParams.get('code') || hashParams.get('code');
  
  console.log('Email confirmation parameters found:', {
    accessToken: !!accessToken,
    refreshToken: !!refreshToken,
    type,
    error,
    code: !!code
  });
  
  if (accessToken || refreshToken || code || type === 'signup') {
    // Redirect to the correct URL with parameters
    const currentOrigin = getCurrentOrigin();
    const params = new URLSearchParams();
    
    if (accessToken) params.set('access_token', accessToken);
    if (refreshToken) params.set('refresh_token', refreshToken);
    if (type) params.set('type', type);
    if (error) params.set('error', error);
    if (code) params.set('code', code);
    
    // Copy all other parameters
    urlParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
    
    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
    
    const redirectUrl = `${currentOrigin}/login?${params.toString()}`;
    console.log('Redirecting to correct URL:', redirectUrl);
    
    window.location.href = redirectUrl;
    return true;
  }
  
  return false;
};