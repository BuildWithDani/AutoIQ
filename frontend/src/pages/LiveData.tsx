import { useEffect, useState } from 'react';
import { apiClient } from '../api';
import type { LiveDataResponse, StatusResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatTimeWithTimezone } from '../utils/dateFormat';

export default function LiveData() {
  const { user } = useAuth();
  const plan = user?.plan || 'free';
  const [data, setData] = useState<LiveDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<StatusResponse | null>(null);

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

  const loadData = async () => {
    const connected = await checkConnection();
    if (!connected) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      const response = await apiClient.getLiveData();
      // Only set data if we have real values (not all N/A)
      const hasRealData = response.rpm !== 'N/A' || response.speed !== 'N/A' || 
                         response.coolant_temp !== 'N/A' || response.intake_temp !== 'N/A' || 
                         response.throttle_pos !== 'N/A';
      if (hasRealData) {
        setData(response);
      } else {
        setData(null);
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
    if (!isPaused && isConnected) {
      loadData();
      const interval = setInterval(() => {
        if (!isPaused) {
          loadData();
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isPaused, isConnected]);

  const parseValue = (value: string): number => {
    if (value === 'N/A' || !value) return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const rpm = data ? parseValue(data.rpm) : 0;
  const speed = data ? parseValue(data.speed) : 0;
  const coolantTemp = data ? parseValue(data.coolant_temp) : 0;
  const intakeTemp = data ? parseValue(data.intake_temp) : 0;
  const throttlePos = data ? parseValue(data.throttle_pos) : 0;

  const Gauge = ({ 
    value, 
    max, 
    label, 
    unit, 
    color = 'primary',
    formatValue 
  }: { 
    value: number; 
    max: number; 
    label: string; 
    unit?: string;
    color?: 'primary' | 'green' | 'red' | 'yellow' | 'purple' | 'orange';
    formatValue?: (v: number) => string;
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colorClasses = {
      primary: 'bg-primary-600',
      green: 'bg-green-500',
      red: 'bg-red-600',
      yellow: 'bg-yellow-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    };

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="text-sm font-medium text-gray-600 mb-1">{label}</div>
          <div className="text-4xl font-bold text-gray-900">
            {formatValue ? formatValue(value) : Math.round(value)}
            {unit && <span className="text-2xl text-gray-500 ml-2">{unit}</span>}
          </div>
        </div>
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${colorClasses[color]}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>{max}</span>
          </div>
        </div>
      </div>
    );
  };

  const CircularGauge = ({
    value,
    max,
    label,
    unit,
    color = 'primary',
  }: {
    value: number;
    max: number;
    label: string;
    unit?: string;
    color?: 'primary' | 'green' | 'red' | 'yellow';
  }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    
    const colorClasses = {
      primary: 'stroke-primary-600',
      green: 'stroke-green-500',
      red: 'stroke-red-600',
      yellow: 'stroke-yellow-500',
    };

    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-600 mb-4">{label}</div>
          <div className="relative inline-block">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              <circle
                cx="64"
                cy="64"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={`${colorClasses[color]} transition-all duration-300`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{Math.round(value)}</div>
                {unit && <div className="text-xs text-gray-500">{unit}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && !data && !isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Checking connection...</div>
        </div>
      </div>
    );
  }

  // Not Connected State
  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Live Data / Performance</h2>
            <p className="text-gray-600 mt-1">Real-time vehicle performance metrics and diagnostics</p>
          </div>
        </div>
        
        <div className="card-premium relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center py-16">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-red-500 to-red-600 rounded-3xl shadow-premium-lg mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/30 to-red-600/30 rounded-3xl blur-xl"></div>
              <svg className="w-16 h-16 relative z-10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g clipPath="url(#clip0_402_1740_ld)">
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
                  <clipPath id="clip0_402_1740_ld">
                    <rect width="24" height="24" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-4">Vehicle Not Connected</div>
            <div className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Please connect your OBD2 scanner to your vehicle to view live performance data.
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={async () => {
                  const connected = await checkConnection();
                  if (connected) {
                    setLoading(true);
                    await loadData();
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
                <div className="text-sm text-gray-500 mt-2">
                  Last detected port: <span className="font-semibold">{connectionStatus.port}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data available (connected but no readings)
  if (isConnected && !data) {
    return (
      <div className="max-w-7xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Live Data / Performance</h2>
            <p className="text-gray-600 mt-1">Real-time vehicle performance metrics and diagnostics</p>
          </div>
        </div>
        
        <div className="card-premium relative overflow-hidden animate-fade-in">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-full blur-3xl"></div>
          <div className="relative z-10 text-center py-16">
            <div className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl shadow-premium-lg mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 rounded-3xl blur-xl"></div>
              <svg className="w-16 h-16 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-4xl font-black text-gray-900 mb-4">Waiting for Data</div>
            <div className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
              Vehicle is connected, but no live data is available yet. Make sure your vehicle's engine is running.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate performance metrics
  const isIdling = rpm < 1000 && speed < 5;
  const isWarmingUp = coolantTemp < 150 && rpm > 0;
  const isNormalOperating = coolantTemp >= 150 && coolantTemp <= 220 && !isIdling;
  const isOverheating = coolantTemp > 220;
  const throttleStatus = throttlePos > 80 ? 'High' : throttlePos > 40 ? 'Moderate' : 'Low';

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Live Data / Performance</h2>
          <p className="text-gray-600 mt-1">Real-time vehicle performance metrics and diagnostics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
            isPaused 
              ? 'bg-gray-100 text-gray-600' 
              : 'bg-green-100 text-green-700 animate-pulse'
          }`}>
            {isPaused ? '⏸ Paused' : '● Live'}
          </div>
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-4 py-2 rounded-lg transition-colors font-semibold ${
              isPaused
                ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          {data?.timestamp && (
            <div className="text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
              <span className="font-semibold">Last update:</span> {formatTimeWithTimezone(data.timestamp, true)}
            </div>
          )}
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">Engine Status</span>
            <div className={`w-3 h-3 rounded-full ${isOverheating ? 'bg-red-500 animate-pulse' : isNormalOperating ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          </div>
          <div className="text-lg font-bold text-gray-900">
            {isOverheating ? 'Overheating' : isWarmingUp ? 'Warming Up' : isNormalOperating ? 'Normal' : isIdling ? 'Idling' : 'Off'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border border-green-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">Throttle</span>
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-gray-900">{throttleStatus}</div>
          <div className="text-xs text-gray-500">{Math.round(throttlePos)}%</div>
        </div>
        <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border border-purple-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">Coolant Temp</span>
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-gray-900">{Math.round(coolantTemp)}°F</div>
          <div className={`text-xs ${isOverheating ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
            {isOverheating ? 'Warning!' : 'Normal'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-lg border border-orange-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase">Intake Temp</span>
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div className="text-lg font-bold text-gray-900">{Math.round(intakeTemp)}°F</div>
          <div className="text-xs text-gray-500">Ambient</div>
        </div>
      </div>

      {/* Main Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-accent-500/20 to-accent-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <CircularGauge
              value={rpm}
              max={8000}
              label="Engine RPM"
              unit="RPM"
              color="primary"
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Idle Range</span>
                <span className="font-semibold text-gray-900">600-900 RPM</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Current Status</span>
                <span className={`font-semibold ${rpm < 1000 ? 'text-green-600' : rpm > 6000 ? 'text-red-600' : 'text-gray-900'}`}>
                  {rpm < 1000 ? 'Idling' : rpm > 6000 ? 'High RPM' : 'Normal'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <CircularGauge
              value={speed}
              max={120}
              label="Vehicle Speed"
              unit="mph"
              color="green"
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">City Speed</span>
                <span className="font-semibold text-gray-900">25-45 mph</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Highway Speed</span>
                <span className="font-semibold text-gray-900">55-75 mph</span>
              </div>
            </div>
          </div>
        </div>
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <CircularGauge
              value={throttlePos}
              max={100}
              label="Throttle Position"
              unit="%"
              color="yellow"
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Throttle Input</span>
                <span className="font-semibold text-gray-900">{Math.round(throttlePos)}%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Response</span>
                <span className={`font-semibold ${throttlePos > 50 ? 'text-green-600' : 'text-gray-600'}`}>
                  {throttlePos > 50 ? 'Active' : 'Minimal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Temperature Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <Gauge
              value={coolantTemp}
              max={250}
              label="Coolant Temperature"
              unit="°F"
              color={coolantTemp > 220 ? 'red' : coolantTemp > 200 ? 'yellow' : 'green'}
              formatValue={(v) => Math.round(v).toString()}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500 mb-1">Normal</div>
                  <div className="font-semibold text-gray-900">180-220°F</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Warning</div>
                  <div className="font-semibold text-yellow-600">220-240°F</div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Critical</div>
                  <div className="font-semibold text-red-600">&gt;240°F</div>
                </div>
              </div>
              {isOverheating && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700 text-xs font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>Engine overheating detected!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card-premium relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <Gauge
              value={intakeTemp}
              max={150}
              label="Intake Air Temperature"
              unit="°F"
              color="purple"
              formatValue={(v) => Math.round(v).toString()}
            />
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Ambient Air</span>
                <span className="font-semibold text-gray-900">{Math.round(intakeTemp)}°F</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Temperature Delta</span>
                <span className="font-semibold text-gray-900">
                  {Math.round(coolantTemp - intakeTemp)}°F
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="card-premium mb-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Detailed Metrics</h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Real-time values</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-xs font-semibold text-gray-600 uppercase">RPM</div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {data?.rpm !== 'N/A' ? Math.round(rpm).toLocaleString() : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Engine speed</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-xs font-semibold text-gray-600 uppercase">Speed</div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {data?.speed !== 'N/A' ? Math.round(speed) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">mph</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs font-semibold text-gray-600 uppercase">Coolant</div>
            </div>
            <div className={`text-3xl font-black mb-1 ${isOverheating ? 'text-red-600' : 'text-gray-900'}`}>
              {data?.coolant_temp !== 'N/A' ? Math.round(coolantTemp) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">°F</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              <div className="text-xs font-semibold text-gray-600 uppercase">Intake</div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {data?.intake_temp !== 'N/A' ? Math.round(intakeTemp) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">°F</div>
          </div>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <div className="text-xs font-semibold text-gray-600 uppercase">Throttle</div>
            </div>
            <div className="text-3xl font-black text-gray-900 mb-1">
              {data?.throttle_pos !== 'N/A' ? Math.round(throttlePos) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500">%</div>
          </div>
        </div>
      </div>

      {/* Plan Badge */}
      <div className="mt-6 bg-gradient-to-r from-white to-gray-50 rounded-xl shadow border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Current Plan:</span>
            <span className={`px-4 py-1 rounded-full text-sm font-medium ${
              plan === 'free' 
                ? 'bg-gray-100 text-gray-700' 
                : plan === 'plus'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-purple-100 text-purple-700'
            }`}>
              {plan === 'free' ? 'Free' : plan === 'plus' ? 'AutoIQ+' : 'Pro+'}
            </span>
          </div>
          {plan === 'free' && (
            <div className="text-xs text-gray-500">
              Upgrade for advanced performance analytics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
