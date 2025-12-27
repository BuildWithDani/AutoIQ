import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import EmailInput from '../components/EmailInput';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Handle email and error from navigation state (when redirected from register)
  useEffect(() => {
    if (location.state) {
      if (location.state.email) {
        setEmail(location.state.email);
      }
      if (location.state.error) {
        showToast(location.state.error, 'error');
        // Clear the state to prevent showing the error again on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      showToast('Login successful!', 'success');
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      // Extract user-friendly error message
      let message = 'Unable to sign in. Please try again.';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        message = detail.message || message;
        
        // Handle specific error codes
        if (detail.code === 'account_not_found') {
          message = 'Account does not exist. Please check your email or sign up for a new account.';
        } else if (detail.code === 'invalid_credentials') {
          message = 'Invalid email or password. Please check your credentials and try again.';
        }
      } else if (error?.message) {
        message = error.message;
      }
      
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30 relative overflow-hidden">
      {/* Enhanced animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/25 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-400/25 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Premium glass card - Enhanced */}
        <div className="glass-strong border-2 border-white/40 shadow-2xl rounded-3xl p-10 md:p-12 backdrop-blur-xl animate-scale-in">
          {/* Logo and Header - Enhanced */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-accent-500 to-indigo-500 opacity-25 blur-2xl group-hover:opacity-35 transition-all duration-500 animate-pulse-glow -z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-primary-400/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 -z-10"></div>
                <img 
                  src="./logo.png" 
                  alt="AutoIQ Logo" 
                  className="h-24 w-24 object-contain transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-2xl relative z-10"
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
            <h1 className="text-5xl font-black tracking-tight mb-3">
              <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                Auto
              </span>
              <span className="bg-gradient-to-r from-accent-600 via-blue-600 to-accent-600 bg-clip-text text-transparent animate-pulse-slow">
                IQ
              </span>
            </h1>
            <p className="text-xs font-bold text-gray-600/90 tracking-widest uppercase mb-4">AI-Powered Vehicle Intelligence</p>
            <p className="text-gray-700 font-semibold text-lg">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-800 mb-2.5">
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
                  className="input-modern w-full pl-12 pr-4 py-3.5"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-premium w-full py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
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
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-600 hover:text-accent-700 font-bold transition-colors inline-flex items-center gap-1 group">
                Sign up
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
