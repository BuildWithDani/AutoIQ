import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import type { CodesResponse, StatusResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../components/ActivityLog';
import { formatDateWithTimezone } from '../utils/dateFormat';

export default function ScanCodes() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [codes, setCodes] = useState<CodesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<StatusResponse | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const checkConnection = async () => {
    try {
      const status = await apiClient.getStatus();
      setConnectionStatus(status);
      setIsConnected(status.connected);
      return status.connected;
    } catch (error) {
      console.error('Failed to check connection:', error);
      setIsConnected(false);
      return false;
    }
  };

  const loadCodes = async () => {
    const connected = await checkConnection();
    if (!connected) {
      setCodes(null);
      showToast('Vehicle not connected. Please connect your OBD2 scanner.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.getCodes();
      setCodes(response);
      setLastScanTime(new Date());
      const totalCodes = (response.stored.length || 0) + (response.pending.length || 0);
      if (totalCodes > 0) {
        logActivity('scan', `Scanned for codes - found ${totalCodes} trouble code(s) from OBD2 scanner`);
        showToast(`Found ${totalCodes} trouble code(s) from OBD2 scanner`, 'success');
      } else {
        showToast('No trouble codes found. Vehicle appears to be healthy.', 'success');
        logActivity('scan', 'Scanned for codes - no trouble codes found');
      }
    } catch (error) {
      console.error('Failed to load codes:', error);
      showToast('Failed to scan for codes. Make sure the vehicle is connected.', 'error');
      setCodes(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCodes = async () => {
    if (!window.confirm('Are you sure you want to clear all trouble codes? This action cannot be undone.')) {
      return;
    }
    setClearing(true);
    try {
      await apiClient.clearCodes();
      await loadCodes();
      showToast('Codes cleared successfully', 'success');
      logActivity('clear_codes', 'All trouble codes cleared');
    } catch (error) {
      console.error('Failed to clear codes:', error);
      showToast('Failed to clear codes', 'error');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    checkConnection();
    loadCodes();
    
    // Check connection status periodically
    const interval = setInterval(() => {
      checkConnection();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const totalCodes = (codes?.stored.length || 0) + (codes?.pending.length || 0);

  // Calculate code statistics by category
  const getCodeCategory = (code: string) => {
    if (code.startsWith('P0')) return { name: 'Powertrain', color: 'red', severity: 'high' };
    if (code.startsWith('P1')) return { name: 'Powertrain (Mfr)', color: 'orange', severity: 'medium' };
    if (code.startsWith('B0')) return { name: 'Body', color: 'blue', severity: 'low' };
    if (code.startsWith('C0')) return { name: 'Chassis', color: 'purple', severity: 'medium' };
    if (code.startsWith('U0')) return { name: 'Network', color: 'indigo', severity: 'medium' };
    return { name: 'Unknown', color: 'gray', severity: 'low' };
  };

  const categoryStats = codes ? {
    powertrain: [...codes.stored, ...codes.pending].filter(c => c.code.startsWith('P')).length,
    body: [...codes.stored, ...codes.pending].filter(c => c.code.startsWith('B')).length,
    chassis: [...codes.stored, ...codes.pending].filter(c => c.code.startsWith('C')).length,
    network: [...codes.stored, ...codes.pending].filter(c => c.code.startsWith('U')).length,
  } : { powertrain: 0, body: 0, chassis: 0, network: 0 };

  const getSeverityInfo = (code: string) => {
    if (code.startsWith('P0')) return { level: 'Critical', color: 'red', icon: '⚠️' };
    if (code.startsWith('P1') || code.startsWith('C0')) return { level: 'Moderate', color: 'orange', icon: '⚡' };
    if (code.startsWith('B0') || code.startsWith('U0')) return { level: 'Minor', color: 'blue', icon: 'ℹ️' };
    return { level: 'Unknown', color: 'gray', icon: '❓' };
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Scan / Codes</h2>
          <p className="text-gray-600">Diagnostic trouble codes and comprehensive vehicle health status</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadCodes}
            disabled={loading}
            className="btn-premium px-6 py-3 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Scan for Codes</span>
              </>
            )}
          </button>
          {codes && totalCodes > 0 && (
            <button
              onClick={handleClearCodes}
              disabled={clearing}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg disabled:opacity-50 font-semibold flex items-center gap-2"
            >
              {clearing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Clearing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear All Codes</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Not Connected State */}
      {!isConnected && (
        <div className="card-premium relative overflow-hidden animate-fade-in mb-8">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center py-16">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl shadow-premium-lg mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/30 to-red-600/30 rounded-3xl blur-xl"></div>
              <svg className="w-16 h-16 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_402_1740)">
                  <path d="M17.6336 11.5653L12.2393 16.9596L15.3514 20.0717C16.841 21.5613 19.2561 21.5613 20.7457 20.0717C22.2353 18.5821 22.2353 16.167 20.7457 14.6774L17.6336 11.5653Z" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M6.80931 11.2036L12.2036 5.80927L9.09151 2.69717C7.60192 1.20757 5.18681 1.20757 3.69721 2.69717C2.20762 4.18676 2.20762 6.60188 3.69721 8.09147L6.80931 11.2036Z" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M13.1909 15.4215L11.2393 13.4699" stroke="#3B82F6" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M16.0954 12.5169L14.1438 10.5653" stroke="#3B82F6" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M20.7456 20.0717L21.9904 21.3165" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M3.69727 2.69714L2.45243 1.4523" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M11.4094 17.7894L18.4635 10.7353" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                  <path d="M13.0334 4.97937L5.97936 12.0335" stroke="#1C1C1C" strokeWidth="1.55182" strokeLinecap="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_402_1740">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-4">Vehicle Not Connected</div>
            <div className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Please connect your OBD2 scanner to your vehicle to scan for diagnostic trouble codes.
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={async () => {
                  const connected = await checkConnection();
                  if (connected) {
                    loadCodes();
                  } else {
                    showToast('Still not connected. Please check your OBD2 scanner connection.', 'error');
                  }
                }}
                className="btn-premium px-8 py-3 font-bold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Check Connection</span>
              </button>
              {connectionStatus?.port && (
                <div className="text-sm text-gray-500">
                  Last detected port: <span className="font-semibold">{connectionStatus.port}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats - Professional Cards */}
      {isConnected && codes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Codes Card */}
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Codes</div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-black text-gray-900 mb-2">{totalCodes}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <span className="font-semibold">{codes.stored.length}</span>
                <span>stored</span>
                <span className="mx-1">•</span>
                <span className="font-semibold">{codes.pending.length}</span>
                <span>pending</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">Code Categories</div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {categoryStats.powertrain > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                      P: {categoryStats.powertrain}
                    </span>
                  )}
                  {categoryStats.body > 0 && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                      B: {categoryStats.body}
                    </span>
                  )}
                  {categoryStats.chassis > 0 && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      C: {categoryStats.chassis}
                    </span>
                  )}
                  {categoryStats.network > 0 && (
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                      U: {categoryStats.network}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-600 pt-2 border-t border-gray-200">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Live data from OBD2 scanner</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stored Codes Card */}
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Stored Codes</div>
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-black text-gray-900 mb-2">{codes.stored.length}</div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Active issues</span> detected
              </div>
            </div>
          </div>

          {/* Pending Codes Card */}
          <div className="card-premium relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Pending Codes</div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="text-5xl font-black text-gray-900 mb-2">{codes.pending.length}</div>
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Intermittent</span> issues
              </div>
            </div>
          </div>
        </div>
      )}

      {isConnected && codes && (
        <div className="space-y-6">
          {/* Stored Codes */}
          {codes.stored.length > 0 && (
            <div className="card-premium relative overflow-hidden animate-slide-in">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Stored Codes</h3>
                      <p className="text-sm text-gray-600">{codes.stored.length} active issue{codes.stored.length !== 1 ? 's' : ''} from OBD2 scanner</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-red-100 to-red-50 text-red-700 rounded-full text-sm font-semibold border border-red-200">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-6 bg-red-50/50 rounded-lg p-3 border border-red-100">
                  These codes indicate active problems that need immediate attention. Address these issues promptly to prevent further damage.
                </p>
                <div className="space-y-4">
                  {codes.stored.map((code, index) => {
                    const category = getCodeCategory(code.code);
                    const severity = getSeverityInfo(code.code);
                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-white to-red-50/30 border-2 border-red-200/50 rounded-xl p-6 hover:shadow-lg hover:border-red-300 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex flex-col items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative">
                              <span className="font-mono font-black text-white text-sm leading-tight text-center px-1">{code.code}</span>
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-700 rounded-full flex items-center justify-center">
                                <span className="text-white text-xs">!</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${
                                category.color === 'red' ? 'text-red-700 bg-red-100' :
                                category.color === 'orange' ? 'text-orange-700 bg-orange-100' :
                                category.color === 'blue' ? 'text-blue-700 bg-blue-100' :
                                category.color === 'purple' ? 'text-purple-700 bg-purple-100' :
                                category.color === 'indigo' ? 'text-indigo-700 bg-indigo-100' :
                                'text-gray-700 bg-gray-100'
                              }`}>
                                {category.name}
                              </span>
                              <span className="text-xs font-semibold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                {severity.level}
                              </span>
                              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                Active
                              </span>
                            </div>
                            <div className="text-gray-900 font-semibold text-lg leading-relaxed mb-2">{code.description}</div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Requires immediate attention</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Pending Codes */}
          {codes.pending.length > 0 && (
            <div className="card-premium relative overflow-hidden animate-slide-in">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Pending Codes</h3>
                      <p className="text-sm text-gray-600">{codes.pending.length} intermittent issue{codes.pending.length !== 1 ? 's' : ''} from OBD2 scanner</p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-700 rounded-full text-sm font-semibold border border-yellow-200">
                    Intermittent
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-6 bg-yellow-50/50 rounded-lg p-3 border border-yellow-100">
                  These codes indicate intermittent issues that may not be currently active. Monitor these codes and address them if they become persistent.
                </p>
                <div className="space-y-4">
                  {codes.pending.map((code, index) => {
                    const category = getCodeCategory(code.code);
                    const severity = getSeverityInfo(code.code);
                    return (
                      <div
                        key={index}
                        className="bg-gradient-to-br from-white to-yellow-50/30 border-2 border-yellow-200/50 rounded-xl p-6 hover:shadow-lg hover:border-yellow-300 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0">
                            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex flex-col items-center justify-center shadow-lg group-hover:scale-110 transition-transform relative">
                              <span className="font-mono font-black text-white text-sm leading-tight text-center px-1">{code.code}</span>
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-700 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide ${
                                category.color === 'red' ? 'text-red-700 bg-red-100' :
                                category.color === 'orange' ? 'text-orange-700 bg-orange-100' :
                                category.color === 'blue' ? 'text-blue-700 bg-blue-100' :
                                category.color === 'purple' ? 'text-purple-700 bg-purple-100' :
                                category.color === 'indigo' ? 'text-indigo-700 bg-indigo-100' :
                                'text-gray-700 bg-gray-100'
                              }`}>
                                {category.name}
                              </span>
                              <span className="text-xs font-semibold text-yellow-700 bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
                                {severity.level}
                              </span>
                              <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                Intermittent
                              </span>
                            </div>
                            <div className="text-gray-900 font-semibold text-lg leading-relaxed mb-2">{code.description}</div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Monitor for recurrence</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* No Codes - Professional Empty State */}
          {codes.stored.length === 0 && codes.pending.length === 0 && (
            <div className="card-premium relative overflow-hidden animate-fade-in">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-accent-500/10 to-accent-600/5 rounded-full blur-3xl"></div>
              <div className="relative z-10 text-center py-16">
                <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-premium-lg mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/30 to-green-600/30 rounded-3xl blur-xl"></div>
                  <svg className="w-16 h-16 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-4xl font-black text-gray-900 mb-4">No Trouble Codes</div>
                <div className="text-xl text-gray-600 mb-6 max-w-md mx-auto">
                  Your vehicle appears to be in excellent health! All systems are operating normally.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                  <div className="bg-white/50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">✓</div>
                    <div className="text-sm font-semibold text-gray-700">Engine System</div>
                    <div className="text-xs text-gray-500">All clear</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">✓</div>
                    <div className="text-sm font-semibold text-gray-700">Emission System</div>
                    <div className="text-xs text-gray-500">All clear</div>
                  </div>
                  <div className="bg-white/50 rounded-lg p-4 border border-green-200">
                    <div className="text-2xl font-bold text-green-600 mb-1">✓</div>
                    <div className="text-sm font-semibold text-gray-700">Body Systems</div>
                    <div className="text-xs text-gray-500">All clear</div>
                  </div>
                </div>
                {lastScanTime && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">Last scanned:</span>
                    <span>{formatDateWithTimezone(lastScanTime)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Explanation Lock */}
      {plan === 'free' && codes && totalCodes > 0 && (
        <div className="mt-8 card-premium relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent-500/10 to-primary-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-premium-lg relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent-500/20 to-accent-600/20 rounded-2xl blur-xl"></div>
                  <svg className="w-10 h-10 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-xl mb-2">AI Diagnostic Locked</div>
                <div className="text-gray-600 mb-6 leading-relaxed">
                  Upgrade to AutoIQ+ to unlock AI-powered explanations, repair recommendations, and cost estimates for these codes.
                </div>
                <button
                  onClick={() => {
                    logActivity('scan', 'Navigated to Settings to upgrade plan');
                    navigate('/settings');
                  }}
                  className="btn-premium px-8 py-3 font-bold"
                >
                  Upgrade to AutoIQ+
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {codes && totalCodes > 0 && plan !== 'free' && (
        <div className="mt-8">
          <button
            onClick={() => {
              logActivity('scan', 'Navigated to AI Diagnostic from Scan Codes');
              navigate('/ai');
            }}
            className="w-full btn-premium px-8 py-4 text-lg font-bold flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Get AI Analysis</span>
          </button>
        </div>
      )}
    </div>
  );
}
