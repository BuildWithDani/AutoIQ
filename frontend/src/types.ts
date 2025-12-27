export type Plan = "free" | "plus" | "pro_plus";

export interface StatusResponse {
  connected: boolean;
  port: string | null;
}

export interface LiveDataResponse {
  rpm: string;
  speed: string;
  coolant_temp: string;
  intake_temp: string;
  throttle_pos: string;
  timestamp: string;
}

export interface TroubleCode {
  code: string;
  description: string;
}

export interface CodesResponse {
  stored: TroubleCode[];
  pending: TroubleCode[];
}

export interface VehicleInfoResponse {
  vin: string | null;
  make: string | null;
  model: string | null;
  year: string | null;
}

export interface PlanResponse {
  plan: Plan;
}

export interface LikelyCause {
  label: string;
  probability: number;
  description?: string;
}

export interface AIDiagnosticCostRange {
  low: number;
  high: number;
  currency?: string;
}

export interface AIExplainResponse {
  severity: number;  // Renamed from overall_severity
  safe_to_drive: boolean;
  safe_to_drive_reason?: string;  // Renamed from safe_to_drive_explanation
  summary: string;
  likely_causes: LikelyCause[];
  estimated_cost_range: {
    low: number;
    high: number;
    currency?: string;
  };
  recommended_actions?: string[];
  raw_model_output?: string;  // For debugging
}

export interface AIDiagnosticRequest {
  dtc_codes?: string[];
  dtc_descriptions?: Record<string, string>;
  vehicle_vin?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  live_data_snapshot?: {
    rpm?: number | string;
    speed?: number | string;
    coolant_temp?: number | string;
    intake_temp?: number | string;
    throttle_pos?: number | string;
  };
  // Legacy fields for backward compatibility
  codes?: string[];
  vehicle?: VehicleInfoResponse | null;
}

// Billing Types
export interface BillingConfigResponse {
  stripe_public_key: string | null;
  billing_enabled: boolean;
}

export interface CheckoutSessionRequest {
  plan: 'plus' | 'pro_plus';
  billing_period?: 'monthly' | 'yearly';
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutSessionResponse {
  checkout_session_id: string;
  checkout_url: string;
}

export interface SubscriptionStatusResponse {
  has_subscription: boolean;
  subscription_id: string | null;
  customer_id: string | null;
}

export interface PortalSessionRequest {
  return_url?: string;
}

export interface PortalSessionResponse {
  portal_url: string;
}

// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
  passwordConfirm: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// User type (matches backend UserResponse)
export interface User {
  id: string;
  email: string;
  plan: Plan;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  created: string;
  updated: string;
}

// Backend response type (snake_case)
export interface UserResponse {
  id: string;
  email: string;
  plan: Plan;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  created: string;
  updated: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

// Account Management Types
export interface UpdateUserInfoRequest {
  email?: string;
  name?: string;
}

export interface UpdateUserInfoResponse {
  message: string;
  user: UserResponse;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

