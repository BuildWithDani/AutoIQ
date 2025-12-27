import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EmailInput from '../components/EmailInput';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, passwordConfirm);
      showToast('Account created successfully!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error('Registration failed:', error);
      // Extract user-friendly error message
      let message = 'Unable to create account. Please try again.';
      let emailExists = false;
      
      try {
        if (error?.response?.data?.detail) {
          const detail = error.response.data.detail;
          if (typeof detail === 'string') {
            message = detail;
            emailExists = detail.toLowerCase().includes('already exists') || 
                         detail.toLowerCase().includes('email already');
          } else if (typeof detail === 'object') {
            message = detail.message || detail.detail || JSON.stringify(detail);
            
            // Handle specific error codes
            if (detail.code === 'email_already_exists' || 
                (typeof message === 'string' && message.toLowerCase().includes('already exists'))) {
              emailExists = true;
              message = 'An account with this email already exists. Please sign in instead.';
            } else if (detail.code === 'validation_error') {
              message = 'Please check your information and try again.';
            } else if (detail.code === 'registration_failed') {
              // Use the message from the detail object
              message = detail.message || message;
            }
          }
        } else if (error?.response?.data?.message) {
          message = error.response.data.message;
          emailExists = message.toLowerCase().includes('already exists') || 
                       message.toLowerCase().includes('email already');
        } else if (error?.message) {
          message = error.message;
          emailExists = message.toLowerCase().includes('already exists') || 
                       message.toLowerCase().includes('email already');
        }
      } catch (parseError) {
        console.error('Error parsing error message:', parseError);
        message = 'Unable to create account. Please try again.';
      }
      
      // If email already exists, redirect to login page with error
      if (emailExists) {
        showToast(message, 'error');
        // Navigate to login page with email pre-filled and error message
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              email: email,
              error: message 
            } 
          });
        }, 1500); // Small delay to show the toast
      } else {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password.length >= 8 ? (password.length >= 12 ? 'strong' : 'medium') : 'weak';
  const passwordsMatch = password && passwordConfirm && password === passwordConfirm;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/30 relative overflow-hidden py-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Premium glass card */}
        <div className="glass border border-white/20 shadow-2xl rounded-3xl p-8 md:p-10 backdrop-blur-xl">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 via-accent-500 to-gray-600 opacity-20 blur-xl group-hover:opacity-30 transition-all duration-500 animate-pulse-glow -z-10"></div>
                <img 
                  src="./logo.png" 
                  alt="AutoIQ Logo" 
                  className="h-20 w-20 object-contain transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback w-20 h-20 mx-auto';
                      fallback.innerHTML = `
                        <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
                              <stop offset="0%" stop-color="#667eea"/>
                              <stop offset="50%" stop-color="#764ba2"/>
                              <stop offset="100%" stop-color="#f093fb"/>
                            </linearGradient>
                          </defs>
                          <path d="M32 16L20 28H28V40H36V28H44L32 16Z" fill="url(#logoGrad)" opacity="0.9"/>
                          <circle cx="32" cy="32" r="2" fill="url(#logoGrad)"/>
                        </svg>
                      `;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            </div>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight mb-2">
              Auto<span className="text-accent-600">IQ</span>
            </h1>
            <p className="text-sm font-semibold text-gray-600/80 tracking-wide uppercase mb-4">AI-Powered Vehicle Intelligence</p>
            <p className="text-gray-600 font-medium">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <EmailInput
                id="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-12 pr-4 py-3.5 bg-white/80 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all shadow-sm hover:shadow-md"
                  placeholder="••••••••"
                />
              </div>
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`flex-1 h-1.5 rounded-full ${
                      passwordStrength === 'strong' ? 'bg-green-500' : 
                      passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-gray-200'
                    }`}></div>
                    <div className={`flex-1 h-1.5 rounded-full ${
                      passwordStrength === 'strong' ? 'bg-green-500' : 
                      passwordStrength === 'medium' ? 'bg-yellow-500' : 'bg-gray-200'
                    }`} style={{ opacity: passwordStrength === 'weak' ? 0.3 : 1 }}></div>
                    <div className={`flex-1 h-1.5 rounded-full ${
                      passwordStrength === 'strong' ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ opacity: passwordStrength === 'weak' ? 0.3 : 1 }}></div>
                  </div>
                  <p className={`text-xs font-medium ${
                    passwordStrength === 'strong' ? 'text-green-600' : 
                    passwordStrength === 'medium' ? 'text-yellow-600' : 'text-gray-500'
                  }`}>
                    {passwordStrength === 'strong' ? '✓ Strong password' : 
                     passwordStrength === 'medium' ? '⚠ Medium strength' : 
                     'Must be at least 8 characters'}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white/80 border rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all shadow-sm hover:shadow-md ${
                    passwordConfirm && passwordsMatch ? 'border-green-300 bg-green-50/50' : 
                    passwordConfirm && !passwordsMatch ? 'border-red-300 bg-red-50/50' : 
                    'border-gray-200'
                  }`}
                  placeholder="••••••••"
                />
              </div>
              {passwordConfirm && (
                <p className={`mt-1 text-xs font-medium flex items-center gap-1 ${
                  passwordsMatch ? 'text-green-600' : 'text-red-600'
                }`}>
                  {passwordsMatch ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Passwords match
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordsMatch || password.length < 8}
              className="w-full bg-gradient-to-r from-gray-700 via-gray-800 to-accent-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-600 hover:text-accent-700 font-bold transition-colors inline-flex items-center gap-1 group">
                Sign in
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-400/10 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}
