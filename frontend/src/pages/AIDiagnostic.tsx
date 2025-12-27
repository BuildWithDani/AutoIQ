import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api';
import type { AIExplainResponse, CodesResponse, LiveDataResponse, VehicleInfoResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../components/ActivityLog';

export default function AIDiagnostic() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [explanation, setExplanation] = useState<AIExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<CodesResponse | null>(null);
  const [liveData, setLiveData] = useState<LiveDataResponse | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfoResponse | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const isLocked = plan === 'free';

  const loadData = useCallback(async () => {
    try {
      const [codesRes, liveDataRes, vehicleRes] = await Promise.all([
        apiClient.getCodes(),
        apiClient.getLiveData(),
        apiClient.getVehicleInfo(),
      ]);
      setCodes(codesRes);
      setLiveData(liveDataRes);
      setVehicleInfo(vehicleRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExplain = useCallback(async () => {
    if (isLocked) return;

    setLoading(true);
    try {
      const allCodes = [
        ...(codes?.stored.map((c) => c.code) || []),
        ...(codes?.pending.map((c) => c.code) || []),
      ];

      if (allCodes.length === 0) {
        showToast('No trouble codes found. Scan for codes first.', 'warning');
        setLoading(false);
        return;
      }

      const response = await apiClient.explainCodes(
        allCodes,
        vehicleInfo || undefined,
        liveData || undefined
      );
      setExplanation(response);
      logActivity('scan', 'AI diagnostic analysis completed');
    } catch (error: any) {
      console.error('Failed to get explanation:', error);
      const errorMessage = error?.message || 'Failed to get AI explanation';
      
      // Handle specific error cases with clear UI messages
      if (errorMessage.includes('PLAN_REQUIRED')) {
        showToast('AI diagnostics require AutoIQ+ plan. Upgrade in Settings to unlock.', 'warning');
        // Show upgrade CTA - the locked state UI will handle this
      } else if (errorMessage.includes('AI_UNAVAILABLE')) {
        showToast('AI diagnostics are not configured. Please contact support or configure OPENROUTER_API_KEY.', 'error');
      } else {
        showToast('Failed to get AI explanation. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [isLocked, codes, liveData, vehicleInfo, showToast]);

  useEffect(() => {
    if (!isLocked && codes && (codes.stored.length > 0 || codes.pending.length > 0) && !explanation) {
      handleExplain();
    }
  }, [codes, isLocked, handleExplain, explanation]);

  if (isLocked) {
    return (
      <div className="max-w-5xl mx-auto animate-fade-in px-4">
        <div className="card-premium p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-accent-500/10 via-primary-500/10 to-accent-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-primary-500/10 to-accent-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center mb-6 relative group">
                {/* Background container with professional styling */}
                <div className="relative w-40 h-40 flex items-center justify-center">
                  {/* Subtle background glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 rounded-3xl shadow-premium-lg border-2 border-gray-200/50"></div>
                  
                  {/* Logo with professional styling */}
                  <div className="relative z-10 w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-400/10 via-accent-500/10 to-accent-600/10 blur-2xl group-hover:opacity-50 transition-all duration-500"></div>
                    <img 
                      src="./logo.png" 
                      alt="AutoIQ Logo" 
                      className="h-28 w-28 object-contain transition-all duration-500 group-hover:scale-105 drop-shadow-xl relative z-10 opacity-60"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('.logo-fallback')) {
                          const fallback = document.createElement('div');
                          fallback.className = 'logo-fallback flex items-center justify-center w-full h-full';
                          fallback.innerHTML = `
                            <svg width="112" height="112" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
                                  <stop offset="0%" stop-color="#475569"/>
                                  <stop offset="50%" stop-color="#2563eb"/>
                                  <stop offset="100%" stop-color="#1e3a8a"/>
                                </linearGradient>
                              </defs>
                              <path d="M32 16L20 28H28V40H36V28H44L32 16Z" fill="url(#logoGrad)" opacity="0.6"/>
                              <circle cx="32" cy="32" r="2" fill="url(#logoGrad)" opacity="0.6"/>
                            </svg>
                          `;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  </div>
                  
                  {/* Professional chain lock overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                    <div className="relative">
                      {/* Lock shadow for depth */}
                      <svg className="absolute inset-0 w-32 h-32 text-gray-900/20 blur-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {/* Main lock icon */}
                      <svg className="w-32 h-32 text-gray-700 drop-shadow-2xl relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {/* Chain link above lock - better integrated */}
                      <svg className="absolute -top-6 left-1/2 -translate-x-1/2 w-10 h-10 text-gray-500 drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Plus badge - professional styling */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-accent-500 to-accent-600 rounded-full flex items-center justify-center shadow-xl border-2 border-white z-30">
                    <span className="text-base font-black text-white">+</span>
                  </div>
                </div>
              </div>
              <h1 className="text-4xl font-black gradient-text-primary mb-4">Upgrade to AutoIQ+</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Unlock AI-powered diagnostics, intelligent repair recommendations, and accurate cost estimates to keep your vehicle running at its best.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              <div className="glass rounded-xl p-6 border border-white/20 hover:border-accent-300/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered Code Analysis</h3>
                    <p className="text-sm text-gray-600">Advanced machine learning algorithms analyze your diagnostic codes to provide intelligent insights.</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-white/20 hover:border-accent-300/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Repair Recommendations</h3>
                    <p className="text-sm text-gray-600">Get expert-level repair suggestions tailored to your specific vehicle and diagnostic codes.</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-white/20 hover:border-accent-300/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Cost Estimates</h3>
                    <p className="text-sm text-gray-600">Receive accurate repair cost estimates to help you budget and make informed decisions.</p>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-6 border border-white/20 hover:border-accent-300/50 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Safety Assessments</h3>
                    <p className="text-sm text-gray-600">Know if your vehicle is safe to drive with comprehensive safety analysis and recommendations.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  logActivity('scan', 'Navigated to Settings to upgrade plan');
                  navigate('/settings');
                }}
                className="btn-premium px-12 py-4 text-lg font-bold shadow-premium-lg hover:shadow-premium-lg transform hover:scale-105 transition-all"
              >
                Upgrade to AutoIQ+ Now
              </button>
              <p className="text-sm text-gray-500 mt-4">Join the Discord for any issues</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-xl font-semibold text-gray-900 mb-2">Analyzing Codes...</div>
            <div className="text-gray-600">AI is processing your vehicle's diagnostic data</div>
          </div>
        </div>
      </div>
    );
  }

  if (!explanation) {
    return (
      <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">AI Diagnostic</h2>
            <p className="text-gray-600 mt-1">Get AI-powered insights about your vehicle's health</p>
          </div>
          <button
            onClick={handleExplain}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Codes'}
          </button>
        </div>

        <div className="card-premium p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent-500/10 to-primary-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 opacity-20 blur-xl group-hover:opacity-30 transition-all duration-500 animate-pulse-glow -z-10"></div>
                <img 
                  src="./logo.png" 
                  alt="AutoIQ Logo" 
                  className="h-24 w-24 object-contain transition-all duration-500 group-hover:rotate-6 group-hover:scale-110 drop-shadow-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback';
                      fallback.innerHTML = `
                        <svg width="96" height="96" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
                              <stop offset="0%" stop-color="#475569"/>
                              <stop offset="50%" stop-color="#2563eb"/>
                              <stop offset="100%" stop-color="#1e3a8a"/>
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
            <div className="text-2xl font-bold text-gray-900 mb-2">No Analysis Yet</div>
            <div className="text-gray-600 mb-6 max-w-md mx-auto">
              Scan for trouble codes first, then click "Analyze Codes" to get AI-powered insights and recommendations.
            </div>
            <button
              onClick={() => {
                logActivity('scan', 'Navigated to Scan Codes from AI Diagnostic');
                navigate('/scan');
              }}
              className="btn-premium px-8 py-3 text-sm font-bold"
            >
              Go to Scan Codes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">AI Diagnostic</h2>
          <p className="text-gray-600 mt-1">AI-powered analysis of your vehicle's diagnostic codes</p>
        </div>
        <button
          onClick={handleExplain}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Re-analyze'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Summary Card */}
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-200 p-6 animate-slide-in">
          <div className="flex items-start gap-4">
            <div className="text-4xl">📋</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Summary</h3>
              <p className="text-gray-700 leading-relaxed text-lg">{explanation.summary}</p>
            </div>
          </div>
        </div>

        {/* Safety & Severity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🛡️</span>
              <span>Safe to Drive?</span>
            </h3>
            <div className={`text-5xl font-bold mb-3 ${
              explanation.safe_to_drive ? 'text-green-600' : 'text-red-600'
            }`}>
              {explanation.safe_to_drive ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`text-sm p-3 rounded-lg ${
              explanation.safe_to_drive 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {explanation.safe_to_drive_reason || (
                explanation.safe_to_drive
                  ? 'Vehicle appears safe to drive, but monitor closely and address issues soon.'
                  : 'Vehicle should be inspected by a qualified mechanic before driving.'
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚠️</span>
              <span>Severity Level</span>
            </h3>
            <div className="text-5xl font-bold text-gray-900 mb-3">
              {explanation.severity}/10
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mt-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  explanation.severity >= 7
                    ? 'bg-red-600'
                    : explanation.severity >= 4
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${(explanation.severity / 10) * 100}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {explanation.severity >= 7 && 'High severity - Immediate attention recommended'}
              {explanation.severity >= 4 && explanation.severity < 7 && 'Medium severity - Address soon'}
              {explanation.severity < 4 && 'Low severity - Monitor condition'}
            </div>
          </div>
        </div>

        {/* Likely Causes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🔍</span>
            <span>Likely Causes</span>
          </h3>
          <div className="space-y-4">
            {explanation.likely_causes.map((cause, index) => (
              <div key={index} className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 text-lg">{cause.label}</div>
                  <div className="text-2xl font-bold text-primary-600">
                    {Math.round(cause.probability * 100)}%
                  </div>
                </div>
                {cause.description && (
                  <div className="text-sm text-gray-600 mb-3">{cause.description}</div>
                )}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all"
                    style={{ width: `${cause.probability * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Estimate */}
        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-lg border border-green-200 p-6 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>💰</span>
            <span>Estimated Repair Cost</span>
          </h3>
          <div className="flex items-baseline gap-3 mb-3">
            <div className="text-5xl font-bold text-green-700">
              ${explanation.estimated_cost_range.low}
            </div>
            <div className="text-2xl text-gray-500">-</div>
            <div className="text-5xl font-bold text-green-700">
              ${explanation.estimated_cost_range.high}
            </div>
            {explanation.estimated_cost_range.currency && explanation.estimated_cost_range.currency !== 'USD' && (
              <div className="text-sm text-gray-500">{explanation.estimated_cost_range.currency}</div>
            )}
          </div>
          <div className="text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200">
            Estimated range based on common repairs for these diagnostic codes. Actual costs may vary based on location, shop rates, and vehicle-specific factors.
          </div>
        </div>

        {/* Recommended Actions */}
        {explanation.recommended_actions && explanation.recommended_actions.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg border border-blue-200 p-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>Recommended Actions</span>
            </h3>
            <ol className="space-y-3 list-decimal list-inside">
              {explanation.recommended_actions.map((action, index) => (
                <li key={index} className="text-gray-700 leading-relaxed">
                  <span className="font-semibold text-gray-900">{index + 1}.</span> {action}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              logActivity('scan', 'Navigated to Scan Codes from AI Diagnostic');
              navigate('/scan');
            }}
            className="flex-1 btn-premium px-6 py-4"
          >
            View All Codes
          </button>
          <button
            onClick={() => {
              logActivity('connect', 'Navigated to Live Data from AI Diagnostic');
              navigate('/live');
            }}
            className="flex-1 btn-premium px-6 py-4"
          >
            View Live Data
          </button>
        </div>
      </div>
    </div>
  );
}
