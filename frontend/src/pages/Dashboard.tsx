import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import type { StatusResponse, VehicleInfoResponse, LiveDataResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../components/ActivityLog';

export default function Dashboard() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [codes, setCodes] = useState({ stored: 0, pending: 0 });
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfoResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveDataResponse | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadStatus();
    loadCodes();
    loadVehicleInfo();
    loadLiveData();
    const interval = setInterval(() => {
      loadStatus();
      loadCodes();
      loadLiveData();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    try {
      const response = await apiClient.getStatus();
      setStatus(response);
    } catch (error) {
      console.error('Failed to load status:', error);
      setStatus({ connected: false, port: null });
    } finally {
      setLoading(false);
    }
  };

  const loadCodes = async () => {
    try {
      const response = await apiClient.getCodes();
      setCodes({
        stored: response.stored.length,
        pending: response.pending.length,
      });
    } catch (error) {
      console.error('Failed to load codes:', error);
    }
  };

  const loadVehicleInfo = async () => {
    try {
      const response = await apiClient.getVehicleInfo();
      setVehicleInfo(response);
    } catch (error) {
      console.error('Failed to load vehicle info:', error);
    }
  };

  const loadLiveData = async () => {
    try {
      const response = await apiClient.getLiveData();
      setLiveData(response);
    } catch (error) {
      console.error('Failed to load live data:', error);
    }
  };

  const handleReconnect = async () => {
    try {
      const response = await apiClient.reconnect();
      setStatus(response);
      if (response.connected) {
        showToast('Reconnected successfully', 'success');
        logActivity('reconnect', 'Backend reconnected successfully');
        await loadVehicleInfo();
        await loadCodes();
        await loadLiveData();
      } else {
        showToast('Failed to reconnect. Please check your OBD device connection.', 'error');
      }
    } catch (error) {
      console.error('Failed to reconnect:', error);
      showToast('Failed to reconnect. Please check your connection.', 'error');
    }
  };

  const parseValue = (value: string): number => {
    if (value === 'N/A') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center animate-fade-in">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 border-4 border-primary-200/50 border-t-primary-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-accent-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-gray-600 font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-5xl font-black mb-3">
            <span className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 bg-clip-text text-transparent">
              Dashboard
            </span>
          </h2>
          <p className="text-gray-600 font-semibold text-lg">Real-time vehicle intelligence & diagnostics</p>
        </div>
        {status?.connected && (
          <div className="glass-strong flex items-center gap-3 px-6 py-3 rounded-2xl border-2 border-emerald-400/40 shadow-xl">
            <div className="relative">
              <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/60 animate-pulse"></div>
              <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-sm font-black text-emerald-700">Live Connection</span>
          </div>
        )}
      </div>

      {/* Premium Connection Status Card - Enhanced */}
      <div className="card-premium p-10 mb-8 animate-fade-in-up relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-primary-500/15 via-accent-500/15 to-indigo-500/15 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
              status?.connected 
                ? 'bg-gradient-to-br from-emerald-500 via-accent-500 to-emerald-600' 
                : 'bg-gradient-to-br from-red-500 via-red-600 to-red-700'
            }`}>
              {status?.connected ? (
                <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connection Status</h3>
              {status?.connected ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-accent-500 rounded-full shadow-lg shadow-accent-500/50 animate-pulse"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-accent-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-gray-700 font-medium">
                    Connected to vehicle on <span className="font-mono font-bold text-primary-600">{status.port || 'unknown port'}</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
                  <span className="text-gray-700 font-medium">Not connected to vehicle</span>
                </div>
              )}
            </div>
          </div>
          {!status?.connected && (
            <button
              onClick={handleReconnect}
              className="btn-premium px-8 py-3.5 text-sm font-bold"
            >
              Reconnect Now
            </button>
          )}
        </div>
        </div>
      </div>

      {/* Premium Vehicle Info Card */}
      {status?.connected && vehicleInfo && (
        <div className="card-premium p-8 mb-6 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary-500/10 via-accent-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900 flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-600 via-accent-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-premium">
                  <svg className="w-9 h-9 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"></path></svg>
                </div>
                <span className="gradient-text-primary">Vehicle Information</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(vehicleInfo.make || vehicleInfo.model || vehicleInfo.year) && (
                <>
                  {vehicleInfo.make && (
                    <div className="glass rounded-xl p-5 border border-white/30 shadow-md hover:shadow-lg transition-all group">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Make</div>
                      <div className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform">{vehicleInfo.make}</div>
                    </div>
                  )}
                  {vehicleInfo.model && (
                    <div className="glass rounded-xl p-5 border border-white/30 shadow-md hover:shadow-lg transition-all group">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Model</div>
                      <div className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform">{vehicleInfo.model}</div>
                    </div>
                  )}
                  {vehicleInfo.year && (
                    <div className="glass rounded-xl p-5 border border-white/30 shadow-md hover:shadow-lg transition-all group">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Year</div>
                      <div className="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform">{vehicleInfo.year}</div>
                    </div>
                  )}
                  {vehicleInfo.vin && (
                    <div className="glass rounded-xl p-5 border border-white/30 shadow-md hover:shadow-lg transition-all md:col-span-1">
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">VIN</div>
                      <div className="text-sm font-mono font-bold text-gray-900 break-all">{vehicleInfo.vin}</div>
                    </div>
                  )}
                </>
              )}
            {!vehicleInfo.vin && !vehicleInfo.make && !vehicleInfo.model && !vehicleInfo.year && (
              <div className="col-span-full text-center py-4">
                <svg className="w-8 h-8 text-gray-400 mb-2 mx-auto" fill="currentColor" viewBox="0 0 20 20"><path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"></path><path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"></path></svg>
                <div className="text-sm text-gray-500">Vehicle information not available</div>
                <div className="text-xs text-gray-400 mt-1">Connect your OBD device to retrieve vehicle details</div>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* Premium Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-red-600 uppercase tracking-wider">Active DTCs</div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              </div>
            </div>
            <div className="text-5xl font-black text-red-900 mb-2 group-hover:scale-105 transition-transform">
              {codes.stored + codes.pending}
            </div>
            {codes.stored > 0 && (
              <div className="text-xs font-semibold text-red-600/80">
                {codes.stored} stored, {codes.pending} pending
              </div>
            )}
            {codes.stored === 0 && codes.pending === 0 && (
              <div className="text-xs font-semibold text-accent-600">✓ No trouble codes</div>
            )}
          </div>
        </div>

        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-accent-600 uppercase tracking-wider">RPM</div>
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"></path></svg>
              </div>
            </div>
            <div className="text-5xl font-black text-accent-700 mb-2 group-hover:scale-105 transition-transform">
              {liveData?.rpm !== 'N/A' ? Math.round(parseValue(liveData?.rpm || '0')) : 'N/A'}
            </div>
            <div className="text-xs font-semibold text-accent-600/80">Current engine speed</div>
          </div>
        </div>

        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-accent-600 uppercase tracking-wider">Speed</div>
              <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-accent-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <span className="text-3xl drop-shadow-md">💨</span>
              </div>
            </div>
            <div className="text-5xl font-black text-accent-700 mb-2 group-hover:scale-105 transition-transform">
              {liveData?.speed !== 'N/A' ? Math.round(parseValue(liveData?.speed || '0')) : 'N/A'}
            </div>
            <div className="text-xs font-semibold text-accent-600/80">mph</div>
          </div>
        </div>

        <div className="card-premium p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Plan</div>
              <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-800 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white drop-shadow-md" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
              </div>
            </div>
            <div className="text-3xl font-black text-gray-800 mb-2 group-hover:scale-105 transition-transform">
              {plan === 'free' ? 'Free' : plan === 'plus' ? 'AutoIQ+' : 'Pro+'}
            </div>
            <div className="text-xs font-semibold text-gray-600/80">
              {plan === 'free' && 'Upgrade for AI features'}
              {plan === 'plus' && 'AI diagnostics enabled'}
              {plan === 'pro_plus' && 'Full access'}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <button
          onClick={() => {
            logActivity('scan', 'Navigated to Scan Codes from Dashboard');
            navigate('/scan');
          }}
          className="group relative overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-accent-600 text-white rounded-2xl p-8 text-left transition-all shadow-premium hover:shadow-premium-lg transform hover:scale-[1.02] hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
          <div className="relative z-10">
            <svg className="w-12 h-12 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"></path></svg>
            <div className="text-2xl font-black mb-2">Start Full Scan</div>
            <div className="text-gray-200/90 text-sm font-medium">Scan for trouble codes and comprehensive diagnostics</div>
          </div>
        </button>

        <button
          onClick={() => {
            logActivity('connect', 'Navigated to Live Data from Dashboard');
            navigate('/live');
          }}
          className="group relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 text-white rounded-2xl p-8 text-left transition-all shadow-premium hover:shadow-premium-lg transform hover:scale-[1.02] hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
          <div className="relative z-10">
            <svg className="w-12 h-12 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"></path></svg>
            <div className="text-2xl font-black mb-2">View Live Data</div>
            <div className="text-gray-300/90 text-sm font-medium">Monitor real-time vehicle performance metrics</div>
          </div>
        </button>

        {plan !== 'free' && (
          <button
            onClick={() => {
              logActivity('scan', 'Navigated to AI Diagnostic from Dashboard');
              navigate('/ai');
            }}
            className="group relative overflow-hidden bg-gradient-to-br from-primary-600 via-accent-600 to-primary-700 text-white rounded-2xl p-8 text-left transition-all shadow-premium hover:shadow-premium-lg transform hover:scale-[1.02] hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"></div>
            <div className="relative z-10">
              <svg className="w-12 h-12 mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
              <div className="text-2xl font-black mb-2">AI Diagnostic</div>
              <div className="text-gray-200/90 text-sm font-medium">Get AI-powered insights and recommendations</div>
            </div>
          </button>
        )}

        {plan === 'free' && (
          <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 text-left border-2 border-dashed border-gray-300">
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">🔒 Locked</span>
            </div>
            <svg className="w-10 h-10 mb-3 opacity-50 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"></path></svg>
            <div className="text-2xl font-bold mb-2 text-gray-600">AI Diagnostic</div>
            <div className="text-gray-500 text-sm mb-4">Upgrade to AutoIQ+ to unlock</div>
            <button
              onClick={() => {
                logActivity('scan', 'Navigated to Settings to upgrade plan');
                navigate('/settings');
              }}
              className="px-4 py-2 bg-gradient-to-r from-gray-600 to-accent-600 text-white rounded-lg hover:from-gray-700 hover:to-accent-700 transition-colors text-sm font-semibold shadow-md"
            >
              Upgrade Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
