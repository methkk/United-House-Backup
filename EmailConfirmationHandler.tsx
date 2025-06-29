import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function EmailConfirmationHandler() {
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [confirmationStatus, setConfirmationStatus] = React.useState<'success' | 'error' | null>(null);
  const [message, setMessage] = React.useState('');
  const [countdown, setCountdown] = React.useState(5);
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Check if this is an email confirmation callback
    const urlParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    // Check for various confirmation patterns in both search and hash
    const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
    const type = urlParams.get('type') || hashParams.get('type');
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
    const tokenHash = urlParams.get('token_hash') || hashParams.get('token_hash');
    const code = urlParams.get('code') || hashParams.get('code');

    console.log('Email confirmation check:', {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      type,
      error,
      errorDescription,
      tokenHash: !!tokenHash,
      code: !!code,
      fullUrl: location.search,
      fullHash: location.hash,
      pathname: location.pathname
    });

    // Only handle if this looks like a confirmation URL AND we're on the login page
    if ((type === 'signup' || type === 'email_change' || accessToken || refreshToken || tokenHash || code || error) && location.pathname === '/login') {
      handleEmailConfirmation(accessToken, refreshToken, type, error, errorDescription, tokenHash, code);
    }
  }, [location]);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showConfirmation && confirmationStatus === 'success' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      handleClose();
    }
    return () => clearTimeout(timer);
  }, [showConfirmation, confirmationStatus, countdown]);

  const handleEmailConfirmation = async (
    accessToken: string | null,
    refreshToken: string | null,
    type: string | null,
    error: string | null,
    errorDescription: string | null,
    tokenHash: string | null,
    code: string | null
  ) => {
    console.log('Processing email confirmation...');

    if (error) {
      console.error('Email confirmation error from URL:', error, errorDescription);
      setConfirmationStatus('error');
      
      if (error === 'access_denied' && errorDescription?.includes('Email link is invalid or has expired')) {
        setMessage('The confirmation link has expired or is invalid. Please request a new confirmation email.');
      } else {
        setMessage(errorDescription || 'Email confirmation failed. Please try again.');
      }
      
      setShowConfirmation(true);
      cleanupUrl();
      return;
    }

    try {
      // Show loading state
      setShowConfirmation(true);
      setConfirmationStatus(null);
      setMessage('Confirming your United-House account...');

      let sessionResult;

      if (code) {
        console.log('Exchanging code for session...');
        // Handle PKCE flow with authorization code
        sessionResult = await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        console.log('Setting session with tokens...');
        // Set the session with the tokens from the URL
        sessionResult = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
      } else if (tokenHash) {
        console.log('Verifying OTP with token hash...');
        // Handle token hash verification
        sessionResult = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'email'
        });
      } else {
        console.log('Getting current session...');
        // Just get the current session to check if user is already authenticated
        sessionResult = await supabase.auth.getSession();
      }

      console.log('Session result:', sessionResult);

      if (sessionResult.error) {
        // Handle specific error cases
        if (sessionResult.error.message?.includes('Email link is invalid or has expired')) {
          throw new Error('The confirmation link has expired or is invalid. Please request a new confirmation email.');
        } else if (sessionResult.error.message?.includes('Email already confirmed')) {
          // This is actually a success case
          setConfirmationStatus('success');
          setMessage('Welcome to United-House! Your email is already confirmed. You can now sign in to your account.');
          setCountdown(5);
          cleanupUrl();
          return;
        } else if (sessionResult.error.message?.includes('Token has expired')) {
          throw new Error('The confirmation link has expired. Please request a new confirmation email.');
        } else {
          throw sessionResult.error;
        }
      }

      if (sessionResult.data.session?.user) {
        console.log('Email confirmation successful!');
        setConfirmationStatus('success');
        setMessage('Welcome to United-House! Your email has been confirmed successfully. You can now sign in to your account.');
        setCountdown(5); // Reset countdown
        cleanupUrl();
      } else {
        // Even if no session, the email might be confirmed
        console.log('No session but email might be confirmed');
        setConfirmationStatus('success');
        setMessage('Welcome to United-House! Your email has been confirmed. You can now sign in to your account.');
        setCountdown(5);
        cleanupUrl();
      }
    } catch (err) {
      console.error('Email confirmation error:', err);
      setConfirmationStatus('error');
      
      if (err.message?.includes('Email link is invalid or has expired') || err.message?.includes('Token has expired')) {
        setMessage('The confirmation link has expired or is invalid. Please request a new confirmation email from the login page.');
      } else if (err.message?.includes('Email already confirmed')) {
        setMessage('Welcome to United-House! Your email is already confirmed. You can sign in to your account.');
        setConfirmationStatus('success');
        setCountdown(5);
      } else {
        setMessage('Email confirmation failed. The link may have expired or already been used. Please request a new confirmation email.');
      }
      
      setShowConfirmation(true);
      cleanupUrl();
    }
  };

  const cleanupUrl = () => {
    // Clean up the URL by removing the query parameters and hash
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  };

  const handleClose = () => {
    setShowConfirmation(false);
    // Stay on login page instead of navigating
  };

  const handleGoToLogin = () => {
    setShowConfirmation(false);
    // Just close the modal, we're already on the login page
  };

  if (!showConfirmation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative animate-in fade-in duration-300">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="mb-4">
            {confirmationStatus === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-in zoom-in duration-500">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            ) : confirmationStatus === 'error' ? (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {confirmationStatus === 'success' 
              ? 'Welcome to United-House!' 
              : confirmationStatus === 'error' 
              ? 'Confirmation Failed' 
              : 'Confirming Your Account...'}
          </h2>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {confirmationStatus === 'success' ? (
            <div className="space-y-3">
              {countdown > 0 && (
                <div className="text-sm text-gray-500">
                  Closing in {countdown} seconds...
                </div>
              )}
              <button
                onClick={handleGoToLogin}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Continue to Login
              </button>
            </div>
          ) : confirmationStatus === 'error' ? (
            <div className="space-y-3">
              <button
                onClick={handleGoToLogin}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors font-medium"
              >
                Continue to Login
              </button>
              <p className="text-sm text-gray-500">
                You can request a new confirmation email from the login page.
              </p>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Please wait while we confirm your United-House account...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}