import { HashRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, memo, lazy, Suspense } from 'react';
import { apiClient } from './api';
import type { StatusResponse, Plan } from './types';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import QuickActions from './components/QuickActions';
import { logActivity } from './components/ActivityLog';

// Lazy load routes for performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScanCodes = lazy(() => import('./pages/ScanCodes'));
const AIDiagnostic = lazy(() => import('./pages/AIDiagnostic'));
const LiveData = lazy(() => import('./pages/LiveData'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

function AppContent() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [vehicleInfo, setVehicleInfo] = useState<{ make: string | null; model: string | null; year: string | null } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    try {
      let hasSeenWelcome = false;
      try {
        hasSeenWelcome = localStorage.getItem('autoiq_welcome_seen') === 'true';
      } catch (e) {
        console.warn('localStorage not available:', e);
      }
      if (!hasSeenWelcome) {
        setShowWelcome(true);
      }
      loadVehicleInfo();
    } catch (error) {
      console.error('Error in App useEffect:', error);
    }
  }, []);

  // Offline detection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await apiClient.getStatus();
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadVehicleInfo = async () => {
    try {
      const response = await apiClient.getVehicleInfo();
      if (response && (response.make || response.model || response.year)) {
        setVehicleInfo({
          make: response.make,
          model: response.model,
          year: response.year,
        });
      } else {
        setVehicleInfo(null);
      }
    } catch (error) {
      console.error('Failed to load vehicle info:', error);
      setVehicleInfo(null);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      loadVehicleInfo();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleWelcomeComplete = () => {
    try {
      localStorage.setItem('autoiq_welcome_seen', 'true');
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    setShowWelcome(false);
  };

  const handlePlanChange = async () => {
    // Refresh user data to get updated plan
    await refreshUser();
    logActivity('scan', 'Plan updated');
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/30">
        <div className="text-center animate-fade-in">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary-200/50 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-r-accent-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <h2 className="text-2xl font-bold gradient-text-primary mb-2">AutoIQ</h2>
          <div className="text-lg text-gray-600 font-medium">Loading Smart Diagnostics...</div>
        </div>
      </div>
    );
  }

  const plan: Plan = user?.plan || 'free';

  return (
    <Router>
      {showWelcome ? (
        <div className="h-screen w-screen">
          <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
            <Welcome onComplete={handleWelcomeComplete} />
          </Suspense>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              <Login />
            </Suspense>
          } />
          <Route path="/register" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
              <Register />
            </Suspense>
          } />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
                <Header 
                  plan={plan} 
                  vehicleInfo={vehicleInfo}
                  isOnline={isOnline}
                />
                <div className="flex flex-1 overflow-hidden flex-col">
                  <div className="flex flex-1 overflow-hidden">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-transparent via-blue-50/20 to-transparent" id="main-content" tabIndex={-1}>
                      <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg"
                      >
                        Skip to content
                      </a>
                      <Suspense fallback={<div className="flex items-center justify-center h-64">Loading...</div>}>
                        <Routes>
                          <Route index element={<Dashboard />} />
                          <Route path="scan" element={<ScanCodes />} />
                          <Route path="ai" element={<AIDiagnostic />} />
                          <Route path="live" element={<LiveData />} />
                          <Route path="settings" element={<Settings onPlanChange={handlePlanChange} />} />
                          <Route path="help" element={<Help />} />
                        </Routes>
                      </Suspense>
                    </main>
                  </div>
                </div>
                {!isOnline && (
                  <div className="fixed bottom-0 left-0 right-0 bg-red-500 text-white px-6 py-2 text-center z-50">
                    <span className="font-medium">⚠️ Backend connection lost. Please check your connection.</span>
                  </div>
                )}
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      )}
    </Router>
  );
}

// Keyboard shortcuts
function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('/');
            break;
          case '2':
            e.preventDefault();
            navigate('/scan');
            break;
          case '3':
            e.preventDefault();
            navigate('/live');
            break;
          case '4':
            e.preventDefault();
            navigate('/ai');
            break;
          case ',':
            e.preventDefault();
            navigate('/settings');
            break;
          case '?':
            e.preventDefault();
            navigate('/help');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  return null;
}

const Header = memo(function Header({ 
  plan, 
  vehicleInfo,
  isOnline,
}: { 
  plan: Plan;
  vehicleInfo: { make: string | null; model: string | null; year: string | null } | null;
  isOnline: boolean;
}) {
  const { user, logout } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await apiClient.getStatus();
        setConnectionStatus(status);
      } catch (error) {
        setConnectionStatus({ connected: false, port: null });
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const planLabels: Record<Plan, string> = {
    free: 'Free',
    plus: 'AutoIQ+',
    pro_plus: 'Pro+',
  };

  const planColors: Record<Plan, string> = {
    free: 'bg-gradient-to-r from-gray-100 via-gray-50 to-gray-200 text-gray-700 shadow-md',
    plus: 'bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 text-white shadow-lg shadow-gray-500/30',
    pro_plus: 'bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 text-white shadow-xl shadow-gray-500/40',
  };

  const hasVehicleInfo = vehicleInfo && (vehicleInfo.make || vehicleInfo.model || vehicleInfo.year);

  return (
    <>
      <KeyboardShortcuts />
      <header className="glass-strong border-b border-white/30 shadow-xl relative overflow-hidden">
        {/* Enhanced animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 via-purple-500/8 to-indigo-500/8"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(14,165,233,0.15),transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(99,102,241,0.1),transparent_60%)]"></div>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
        
        <div className="relative px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {/* Premium Logo - Enhanced */}
              <div className="flex-shrink-0 relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-accent-500 to-indigo-500 opacity-25 blur-2xl group-hover:opacity-35 transition-all duration-500 animate-pulse-glow -z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent-400/20 to-primary-400/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500 -z-10"></div>
                <img 
                  src="./logo.png" 
                  alt="AutoIQ Logo" 
                  className="h-16 w-16 object-contain transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-2xl relative z-10"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback';
                      fallback.innerHTML = `
                        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <div className="space-y-1.5">
                <h1 className="text-4xl font-black tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
                    Auto
                  </span>
                  <span className="bg-gradient-to-r from-accent-600 via-blue-600 to-accent-600 bg-clip-text text-transparent animate-pulse-slow">
                    IQ
                  </span>
                </h1>
                <p className="text-xs font-bold text-gray-600/90 tracking-widest uppercase">AI-Powered Vehicle Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              {/* Connection Status - Enhanced */}
              <div className={`flex items-center gap-3 glass-strong px-5 py-2.5 rounded-xl border-2 shadow-lg transition-all ${
                connectionStatus?.connected && isOnline
                  ? 'border-emerald-300/50 bg-emerald-50/50'
                  : 'border-red-300/50 bg-red-50/50'
              }`}>
                <div className="relative">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      connectionStatus?.connected && isOnline
                        ? 'bg-emerald-500 shadow-lg shadow-emerald-500/60 animate-pulse'
                        : 'bg-red-500 shadow-lg shadow-red-500/60'
                    }`}
                    title={connectionStatus?.connected && isOnline ? 'Connected' : 'Disconnected'}
                  />
                  {connectionStatus?.connected && isOnline && (
                    <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping opacity-75"></div>
                  )}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${
                  connectionStatus?.connected && isOnline ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {connectionStatus?.connected && isOnline ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Vehicle Info Badge - Enhanced */}
              {hasVehicleInfo && (
                <div className="hidden md:flex items-center gap-3 glass-strong px-5 py-2.5 rounded-xl border-2 border-white/30 shadow-lg hover:shadow-xl transition-all group cursor-default">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 via-accent-600 to-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <svg className="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"></path></svg>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 leading-tight">
                      {[vehicleInfo.make, vehicleInfo.model, vehicleInfo.year].filter(Boolean).join(' ')}
                    </div>
                    <div className="text-xs text-gray-600 font-semibold">Active Vehicle</div>
                  </div>
                </div>
              )}

              {/* Plan Badge - Enhanced with Premium Glitch Effect */}
              <div className="flex items-center gap-3 glass-strong px-5 py-2.5 rounded-xl border-2 border-white/30 shadow-lg hover:shadow-xl transition-all duration-300">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Plan</span>
                <span className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all duration-300 ${planColors[plan]} relative overflow-hidden border-2 ${
                  plan === 'free' 
                    ? 'border-gray-300/50 hover:border-gray-400/60' 
                    : 'border-white/40 hover:border-white/60'
                } group`}>
                  {/* Animated gradient overlay for paid plans */}
                  {plan !== 'free' && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/10 animate-pulse-slow"></div>
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                      {/* Subtle glow effect */}
                      <div className={`absolute -inset-1 rounded-xl blur-sm opacity-0 group-hover:opacity-60 transition-opacity duration-300 ${
                        plan === 'plus' ? 'bg-gray-500/50' : 'bg-gray-500/50'
                      }`}></div>
                    </>
                  )}
                  {/* Text with better contrast */}
                  <span className="relative z-10 drop-shadow-sm">{planLabels[plan]}</span>
                  {/* Premium badge indicator */}
                  {plan !== 'free' && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white/80 animate-ping"></div>
                  )}
                </span>
              </div>

              {/* User Email & Logout - Enhanced */}
              {user && (
                <div className="flex items-center gap-3 glass-strong px-5 py-2.5 rounded-xl border-2 border-white/30 shadow-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-xs font-bold text-gray-800 leading-tight">{user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="ml-2 px-3 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-all duration-200"
                    title="Logout"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
});

const Sidebar = memo(function Sidebar() {
  const location = useLocation();

  const navItems = [
    { path: '', label: 'Dashboard', icon: 'dashboard', ariaLabel: 'Navigate to Dashboard' },
    { path: 'scan', label: 'Scan / Codes', icon: 'scan', ariaLabel: 'Navigate to Scan Codes' },
    { path: 'ai', label: 'AI Diagnostic', icon: 'ai', ariaLabel: 'Navigate to AI Diagnostic' },
    { path: 'live', label: 'Live Data', icon: 'chart', ariaLabel: 'Navigate to Live Data' },
    { path: 'settings', label: 'Settings', icon: 'settings', ariaLabel: 'Navigate to Settings' },
    { path: 'help', label: 'Help', icon: 'help', ariaLabel: 'Navigate to Help' },
  ];

  return (
    <aside className="w-72 glass-strong border-r border-white/30 p-6 relative overflow-hidden flex flex-col shadow-xl">
      {/* Enhanced decorative gradient background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary-500/15 via-accent-500/10 to-purple-500/15 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/15 via-pink-500/10 to-accent-500/15 rounded-full blur-3xl -z-10 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl -z-10 -translate-x-1/2 -translate-y-1/2"></div>
      
      <nav className="space-y-3 relative z-10 flex-1" role="navigation" aria-label="Main navigation">
        {navItems.map((item, index) => {
          const currentPath = location.pathname.replace(/^#/, '') || '/';
          const itemPath = item.path === '' ? '/' : item.path;
          const isActive = currentPath === itemPath;
          return (
            <Link
              key={item.path}
              to={itemPath}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 relative overflow-hidden ${
                isActive
                  ? 'glass-strong bg-gradient-to-r from-primary-600/10 via-accent-600/15 to-primary-600/10 text-gray-900 font-bold shadow-lg border-2 border-accent-500/30 scale-[1.03]'
                  : 'text-gray-700 hover:glass hover:bg-white/70 hover:shadow-md hover:scale-[1.02] hover:border-white/40 border border-transparent'
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Active indicator - Enhanced */}
              {isActive && (
                <>
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary-600 via-accent-600 to-primary-600 rounded-r-full shadow-lg shadow-accent-500/50"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-accent-500/5 to-transparent rounded-2xl"></div>
                </>
              )}
              
              {/* Icon Container - Enhanced */}
              <div 
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-lg shadow-accent-500/50 scale-110' 
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gradient-to-br group-hover:from-primary-500/20 group-hover:to-accent-500/20 group-hover:text-accent-600 group-hover:scale-110'
                }`}
                aria-hidden="true"
              >
                <div className="w-5 h-5">
                {item.icon === 'dashboard' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>
                )}
                {item.icon === 'scan' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
                )}
                {item.icon === 'ai' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
                )}
                {item.icon === 'chart' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
                )}
                {item.icon === 'settings' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"></path></svg>
                )}
                {item.icon === 'help' && (
                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                )}
                </div>
              </div>
              
              <span className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-700 group-hover:text-accent-600'}`}>
                {item.label}
              </span>
              
              {/* Hover shimmer effect - Enhanced */}
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer transition-opacity duration-500"></div>
              )}

              {/* Active glow effect */}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent-500/10 via-primary-500/10 to-accent-500/10 rounded-2xl animate-pulse-slow"></div>
              )}
            </Link>
          );
        })}
      </nav>
      
          {/* Quick Actions at bottom of sidebar */}
          <div className="relative z-10 mt-auto">
            <QuickActions />
          </div>
    </aside>
  );
});

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
