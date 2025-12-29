import axios from 'axios';
import type {
  StatusResponse,
  LiveDataResponse,
  CodesResponse,
  VehicleInfoResponse,
  PlanResponse,
  AIExplainResponse,
  AIDiagnosticRequest,
  BillingConfigResponse,
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  SubscriptionStatusResponse,
  PortalSessionRequest,
  PortalSessionResponse,
  SwitchBillingPeriodRequest,
  SwitchBillingPeriodResponse,
  UpgradeSubscriptionRequest,
  UpgradeSubscriptionResponse,
  RegisterRequest,
  LoginRequest,
  AuthResponse,
  UserResponse,
  UpdateUserInfoRequest,
  UpdateUserInfoResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from './types';

// Hybrid Setup: Route requests to correct backend
// Railway backend (public) - for auth, billing, AI, account management
const RAILWAY_API_URL = 
  (window as any).electron?.railwayUrl || 
  import.meta.env.VITE_RAILWAY_API_URL || 
  'https://autoiq-production.up.railway.app';

// Local backend (OBD) - for device connection and diagnostics
const LOCAL_API_URL = 
  (window as any).electron?.localUrl || 
  import.meta.env.VITE_API_URL || 
  'http://127.0.0.1:8001';

// Helper function to determine which backend to use based on endpoint
function getApiBaseUrl(endpoint: string): string {
  // OBD endpoints go to local backend (requires physical device access)
  const obdEndpoints = [
    '/api/status',
    '/api/reconnect',
    '/api/live-data',
    '/api/codes',
    '/api/clear-codes',
    '/api/vehicle',
  ];
  
  if (obdEndpoints.some(ep => endpoint.startsWith(ep))) {
    return LOCAL_API_URL;
  }
  
  // Everything else (auth, billing, AI, account) goes to Railway
  return RAILWAY_API_URL;
}

// Create axios client factory with interceptors
const createApiClient = (baseURL: string) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
  });

  // Add request interceptor for JWT token and debugging
  client.interceptors.request.use(
    (config) => {
      // Add JWT token from localStorage if available
      const token = localStorage.getItem('autoiq_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('API Request:', config.method?.toUpperCase(), config.url, '→', baseURL);
      return config;
    },
    (error) => {
      console.error('API Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor to handle 401 (unauthorized)
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Token expired or invalid, clear it
        localStorage.removeItem('autoiq_token');
        // Redirect to login if not already there
        if (window.location.hash !== '#/login' && window.location.hash !== '#/register') {
          window.location.hash = '#/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Smart API client that routes requests to correct backend
const api = {
  get: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    const baseURL = getApiBaseUrl(url);
    const client = createApiClient(baseURL);
    return client.get<T>(url, config);
  },
  post: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    const baseURL = getApiBaseUrl(url);
    const client = createApiClient(baseURL);
    return client.post<T>(url, data, config);
  },
  put: <T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> => {
    const baseURL = getApiBaseUrl(url);
    const client = createApiClient(baseURL);
    return client.put<T>(url, data, config);
  },
  delete: <T = any>(url: string, config?: any): Promise<{ data: T }> => {
    const baseURL = getApiBaseUrl(url);
    const client = createApiClient(baseURL);
    return client.delete<T>(url, config);
  },
};


export const apiClient = {
  // Auth methods
  async register(request: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', request);
    return response.data;
  },

  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', request);
    return response.data;
  },

  async getCurrentUser(token?: string): Promise<UserResponse> {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await api.get<UserResponse>('/api/auth/me', config);
    return response.data;
  },

  // OBD methods (no auth required)
  async getStatus(): Promise<StatusResponse> {
    const response = await api.get<StatusResponse>('/api/status');
    return response.data;
  },

  async reconnect(): Promise<StatusResponse> {
    const response = await api.post<StatusResponse>('/api/reconnect');
    return response.data;
  },

  async getLiveData(): Promise<LiveDataResponse> {
    const response = await api.get<LiveDataResponse>('/api/live-data');
    return response.data;
  },

  async getCodes(): Promise<CodesResponse> {
    const response = await api.get<CodesResponse>('/api/codes');
    return response.data;
  },

  async clearCodes(): Promise<void> {
    await api.post('/api/clear-codes');
  },

  async getVehicleInfo(): Promise<VehicleInfoResponse> {
    const response = await api.get<VehicleInfoResponse>('/api/vehicle');
    return response.data;
  },

  async getPlan(): Promise<PlanResponse> {
    try {
      const response = await api.get<PlanResponse>('/api/plan');
      // Validate response structure
      if (!response.data || typeof response.data.plan !== 'string') {
        console.warn('Invalid plan response, defaulting to free');
        return { plan: 'free' };
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to get plan:', error);
      // Return default plan on error
      return { plan: 'free' };
    }
  },

  async updatePlan(plan: 'free' | 'plus' | 'pro_plus'): Promise<PlanResponse> {
    const response = await api.post<PlanResponse>('/api/plan', { plan });
    return response.data;
  },

  async explainCodes(
    codes: string[],
    vehicle?: VehicleInfoResponse,
    liveData?: LiveDataResponse
  ): Promise<AIExplainResponse> {
    try {
      // Build DTC descriptions from codes if we have them
      const dtcDescriptions: Record<string, string> = {};
      
      // Try to get code descriptions from the codes endpoint if available
      try {
        const codesResponse = await this.getCodes();
        const allCodes = [...codesResponse.stored, ...codesResponse.pending];
        for (const codeObj of allCodes) {
          if (codes.includes(codeObj.code)) {
            dtcDescriptions[codeObj.code] = codeObj.description;
          }
        }
      } catch (e) {
        // Ignore if we can't get descriptions
      }
      
      // Build strongly typed request payload
      const payload: AIDiagnosticRequest = {
        codes, // Legacy field for backward compatibility
        dtc_codes: codes,
        dtc_descriptions: Object.keys(dtcDescriptions).length > 0 ? dtcDescriptions : undefined,
      };
      
      // Add vehicle info
      if (vehicle) {
        payload.vehicle = vehicle; // Legacy field
        if (vehicle.vin) payload.vehicle_vin = vehicle.vin;
        if (vehicle.make) payload.vehicle_make = vehicle.make;
        if (vehicle.model) payload.vehicle_model = vehicle.model;
        if (vehicle.year) {
          const yearNum = parseInt(vehicle.year);
          if (!isNaN(yearNum)) payload.vehicle_year = yearNum;
        }
      }
      
      // Add live data
      if (liveData) {
        payload.live_data_snapshot = {
          rpm: liveData.rpm !== 'N/A' ? parseFloat(liveData.rpm) || undefined : undefined,
          speed: liveData.speed !== 'N/A' ? parseFloat(liveData.speed) || undefined : undefined,
          coolant_temp: liveData.coolant_temp !== 'N/A' ? parseFloat(liveData.coolant_temp) || undefined : undefined,
          intake_temp: liveData.intake_temp !== 'N/A' ? parseFloat(liveData.intake_temp) || undefined : undefined,
          throttle_pos: liveData.throttle_pos !== 'N/A' ? parseFloat(liveData.throttle_pos) || undefined : undefined,
        };
        // Remove undefined values
        Object.keys(payload.live_data_snapshot).forEach(key => {
          if (payload.live_data_snapshot![key as keyof typeof payload.live_data_snapshot] === undefined) {
            delete payload.live_data_snapshot![key as keyof typeof payload.live_data_snapshot];
          }
        });
        if (Object.keys(payload.live_data_snapshot).length === 0) {
          delete payload.live_data_snapshot;
        }
      }
      
      const response = await api.post<AIExplainResponse>('/api/ai/explain', payload);
      return response.data;
    } catch (error: any) {
      // Handle specific error codes
      if (error.response?.status === 402) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object' && detail.code === 'plan_required') {
          throw new Error('PLAN_REQUIRED: ' + (detail.message || 'AI diagnostics require AutoIQ+'));
        }
      }
      if (error.response?.status === 503) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object' && detail.code === 'ai_unavailable') {
          throw new Error('AI_UNAVAILABLE: ' + (detail.message || 'AI diagnostics are not available'));
        }
      }
      throw error;
    }
  },

  async getBillingConfig(): Promise<BillingConfigResponse> {
    const response = await api.get<BillingConfigResponse>('/api/billing/config');
    return response.data;
  },

  async createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSessionResponse> {
    try {
      const response = await api.post<CheckoutSessionResponse>('/api/billing/create-checkout-session', request);
      return response.data;
    } catch (error: any) {
      // Extract detailed error message from response
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object') {
          // If detail is an object with message/code
          const message = detail.message || detail.code || 'Unknown error';
          throw new Error(message);
        } else if (typeof detail === 'string') {
          // If detail is a string
          throw new Error(detail);
        }
      }
      // Fallback to original error message
      if (error.response?.status === 503) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object' && detail.code === 'billing_unavailable') {
          throw new Error('BILLING_UNAVAILABLE: ' + (detail.message || 'Billing is not configured'));
        }
      }
      throw error;
    }
  },

  async getSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
    const response = await api.get<SubscriptionStatusResponse>('/api/billing/subscription-status');
    return response.data;
  },

  async createPortalSession(request?: PortalSessionRequest): Promise<PortalSessionResponse> {
    try {
      const response = await api.post<PortalSessionResponse>('/api/billing/create-portal-session', request || {});
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object' && detail.code === 'no_subscription') {
          throw new Error('NO_SUBSCRIPTION: ' + (detail.message || 'No active subscription found'));
        }
      }
      if (error.response?.status === 503) {
        const detail = error.response.data?.detail;
        if (typeof detail === 'object' && detail.code === 'billing_unavailable') {
          throw new Error('BILLING_UNAVAILABLE: ' + (detail.message || 'Billing is not configured'));
        }
      }
      throw error;
    }
  },

  async switchBillingPeriod(request: SwitchBillingPeriodRequest): Promise<SwitchBillingPeriodResponse> {
    try {
      const response = await api.post<SwitchBillingPeriodResponse>('/api/billing/switch-billing-period', request);
      return response.data;
    } catch (error: any) {
      // Extract detailed error message from response
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object') {
          const message = detail.message || detail.code || 'Failed to switch billing period';
          throw new Error(message);
        } else if (typeof detail === 'string') {
          throw new Error(detail);
        }
      }
      throw error;
    }
  },

  async upgradeSubscription(request: UpgradeSubscriptionRequest): Promise<UpgradeSubscriptionResponse> {
    try {
      const response = await api.post<UpgradeSubscriptionResponse>('/api/billing/upgrade-subscription', request);
      return response.data;
    } catch (error: any) {
      // Extract detailed error message from response
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'object') {
          const message = detail.message || detail.code || 'Failed to upgrade subscription';
          throw new Error(message);
        } else if (typeof detail === 'string') {
          throw new Error(detail);
        }
      }
      throw error;
    }
  },

  // Account Management
  async updateAccountInfo(request: UpdateUserInfoRequest): Promise<UpdateUserInfoResponse> {
    const response = await api.put<UpdateUserInfoResponse>('/api/account/info', request);
    return response.data;
  },

  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await api.post<ChangePasswordResponse>('/api/account/change-password', request);
    return response.data;
  },
};

