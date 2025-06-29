import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, UserPlus, LogIn, User, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { 
  supabase, 
  signUpWithCustomBranding, 
  resetPasswordWithCustomBranding, 
  resendConfirmationWithCustomBranding 
} from '../lib/supabase';
import { SEOHead } from '../components/SEOHead';

export function LoginPage() {
  const [isLogin, setIsLogin] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [surname, setSurname] = React.useState('');
  const [firstName, setFirstName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [dateOfBirth, setDateOfBirth] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState('');
  const [resendingEmail, setResendingEmail] = React.useState(false);
  const [showResendOption, setShowResendOption] = React.useState(false);
  const [resendEmail, setResendEmail] = React.useState('');
  const [showResetPassword, setShowResetPassword] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState('');
  const [resettingPassword, setResettingPassword] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    // Check if user came from email confirmation - but don't handle it here
    // Let the EmailConfirmationHandler component handle it
    const urlParams = new URLSearchParams(location.search);
    const confirmed = urlParams.get('confirmed');
    
    if (confirmed === 'true') {
      setSuccessMessage('Your email has been confirmed successfully! You can now sign in to your account.');
      // Clean up URL
      window.history.replaceState({}, document.title, '/login');
    }
  }, [location]);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const validateAge = (birthDate: string): string | null => {
    if (!birthDate) return 'Date of birth is required';
    
    const today = new Date();
    const birth = new Date(birthDate);
    
    // Check if the date is valid
    if (isNaN(birth.getTime())) {
      return 'Please enter a valid date';
    }
    
    // Check if the date is not in the future
    if (birth > today) {
      return 'Date of birth cannot be in the future';
    }
    
    // Calculate age
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age < 14) {
      return 'You must be at least 14 years old to create an account';
    }
    
    if (age > 120) {
      return 'Please enter a valid date of birth';
    }
    
    return null;
  };

  const getMaxDate = (): string => {
    // Calculate the date 14 years ago from today
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 14, today.getMonth(), today.getDate());
    return maxDate.toISOString().split('T')[0];
  };

  const getMinDate = (): string => {
    // Set minimum date to 120 years ago
    const today = new Date();
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    return minDate.toISOString().split('T')[0];
  };

  const handleResendConfirmation = async () => {
    if (!resendEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      setResendingEmail(true);
      setError('');
      
      console.log('Resending confirmation with United-House branding...');
      
      const { error } = await resendConfirmationWithCustomBranding(resendEmail);

      if (error) {
        console.error('Resend error:', error);
        throw error;
      }

      setSuccessMessage('A new confirmation email has been sent from United-House! Please check your inbox and spam folder.');
      setShowResendOption(false);
      setResendEmail('');
    } catch (err) {
      console.error('Error resending confirmation:', err);
      if (err.message?.includes('Email rate limit exceeded')) {
        setError('Too many email requests. Please wait a few minutes before trying again.');
      } else if (err.message?.includes('User not found')) {
        setError('No account found with this email address. Please check your email or create a new account.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to resend confirmation email. Please try again.');
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    try {
      setResettingPassword(true);
      setError('');

      console.log('Sending password reset with United-House branding...');

      const { error } = await resetPasswordWithCustomBranding(resetEmail);

      if (error) throw error;

      setSuccessMessage('Password reset instructions have been sent from United-House to your email.');
      setShowResetPassword(false);
      setResetEmail('');
    } catch (err) {
      console.error('Error resetting password:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset password email');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log('Attempting login...');
        
        // Trim whitespace from email and password
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        
        if (!trimmedEmail || !trimmedPassword) {
          setError('Please enter both email and password');
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          console.error('Login error:', error);
          
          // Handle different types of authentication errors
          if (error.message.includes('Invalid login credentials') || 
              error.message.includes('invalid_credentials') ||
              error.message.includes('Invalid email or password')) {
            setError('Invalid email or password. Please check your credentials and try again.');
          } else if (error.message.includes('Email not confirmed') || 
                     error.message.includes('email_not_confirmed') ||
                     error.message.includes('signup_disabled')) {
            setError('Please confirm your email address before logging in. Check your inbox for a confirmation email.');
            setShowResendOption(true);
            setResendEmail(trimmedEmail);
          } else if (error.message.includes('Too many requests')) {
            setError('Too many login attempts. Please wait a few minutes before trying again.');
          } else if (error.message.includes('User not found')) {
            setError('No account found with this email address. Please check your email or create a new account.');
          } else {
            setError(`Login failed: ${error.message}`);
          }
          return;
        }

        // Additional check for email confirmation
        if (data.user && !data.user.email_confirmed_at) {
          setError('Please confirm your email address before logging in.');
          setShowResendOption(true);
          setResendEmail(trimmedEmail);
          return;
        }

        console.log('Login successful, navigating to home...');
        navigate('/');
      } else {
        // Validate required fields
        if (!email || !password || !confirmPassword || !surname || !firstName || !username || !dateOfBirth) {
          setError('Please fill in all fields');
          return;
        }

        // Validate password
        const passwordError = validatePassword(password);
        if (passwordError) {
          setError(passwordError);
          return;
        }

        // Validate password match
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        // Validate age
        const ageError = validateAge(dateOfBirth);
        if (ageError) {
          setError(ageError);
          return;
        }

        try {
          // Check if username is already taken
          const { data: existingUser, error: userError } = await supabase
            .from('profiles')
            .select('username')
            .eq('username', username)
            .maybeSingle();

          if (userError && userError.code !== 'PGRST116') {
            throw userError;
          }
          
          if (existingUser) {
            setError('Username is already taken. Please choose a different username.');
            return;
          }

          console.log('Creating account with United-House branding...');

          const { data: signUpData, error: signUpError } = await signUpWithCustomBranding(
            email,
            password,
            {
              surname,
              first_name: firstName,
              username,
              date_of_birth: dateOfBirth,
            }
          );
          
          if (signUpError) {
            console.error('Signup error:', signUpError);
            throw signUpError;
          }

          if (signUpData.user) {
            if (signUpData.user.identities && signUpData.user.identities.length === 0) {
              setError('An account with this email already exists. Please try logging in instead.');
              return;
            }

            console.log('Account created successfully');
            setSuccessMessage(
              'Welcome to United-House! Your account has been created successfully. Please check your email (including spam folder) to confirm your account before logging in.'
            );
            setShowResendOption(true);
            setResendEmail(email);
            
            // Reset form
            setEmail('');
            setPassword('');
            setConfirmPassword('');
            setSurname('');
            setFirstName('');
            setUsername('');
            setDateOfBirth('');
            setIsLogin(true);
          }
        } catch (err) {
          console.error('Auth error:', err);
          if (err.message?.includes('User already registered')) {
            setError('An account with this email already exists. Please try logging in instead.');
          } else {
            setError(err.message || 'Failed to create account. Please try again.');
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = isLogin ? 'Sign In to United-House' : 'Create Your United-House Account';
  const pageDescription = isLogin 
    ? 'Sign in to United-House to connect with government officials and join community discussions.'
    : 'Create your United-House account to start connecting with government officials and participating in civic discussions.';

  return (
    <>
      <SEOHead 
        title={pageTitle}
        description={pageDescription}
        keywords="United House login, united-house sign in, government platform login, civic engagement account"
        noindex={true}
      />
      
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to United-House' : 'Join United-House'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin 
              ? 'Connect with government officials and communities' 
              : 'Create your account to start engaging in civic discussions'
            }
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {successMessage ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{successMessage}</p>
                    </div>
                  </div>
                </div>
                {showResendOption && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-4">
                      Didn't receive the confirmation email from United-House? You can request a new one:
                    </p>
                    <div className="mb-4">
                      <input
                        type="email"
                        placeholder="Enter your email address"
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={handleResendConfirmation}
                      disabled={resendingEmail || !resendEmail.trim()}
                      className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {resendingEmail ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Resend United-House Confirmation Email
                        </>
                      )}
                    </button>
                  </div>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setSuccessMessage('');
                      setShowResendOption(false);
                      setError('');
                    }}
                    className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : showResendOption ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="resendEmail" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="resendEmail"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex items-center justify-between space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResendOption(false);
                      setError('');
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={handleResendConfirmation}
                    disabled={resendingEmail || !resendEmail.trim()}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {resendingEmail ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Email
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : showResetPassword ? (
              <div className="space-y-6">
                <div>
                  <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                )}

                <div className="flex items-center justify-between space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setError('');
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Back to Login
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="flex-1 flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {resettingPassword ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Reset Password'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                        Create Username
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="username"
                          name="username"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="surname" className="block text-sm font-medium text-gray-700">
                          Surname
                        </label>
                        <div className="mt-1">
                          <input
                            id="surname"
                            name="surname"
                            type="text"
                            required
                            value={surname}
                            onChange={(e) => setSurname(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                          First Name
                        </label>
                        <div className="mt-1">
                          <input
                            id="firstName"
                            name="firstName"
                            type="text"
                            required
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                        Date of Birth
                      </label>
                      <div className="mt-1">
                        <input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          required
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          min={getMinDate()}
                          max={getMaxDate()}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        You must be at least 14 years old to create an account
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    {isLogin ? 'Password' : 'Create Password'}
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={isLogin ? 'current-password' : 'new-password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Re-type Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetPassword(true);
                        setError('');
                      }}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : isLogin ? (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign in to United-House
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join United-House
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {!successMessage && !showResendOption && !showResetPassword && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isLogin ? (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create a United-House account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign in to existing account
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}