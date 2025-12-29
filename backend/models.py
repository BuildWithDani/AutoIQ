from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


class StatusResponse(BaseModel):
    connected: bool
    port: Optional[str] = None


class LiveDataResponse(BaseModel):
    rpm: str
    speed: str
    coolant_temp: str
    intake_temp: str
    throttle_pos: str
    timestamp: str


class TroubleCode(BaseModel):
    code: str
    description: str


class CodesResponse(BaseModel):
    stored: List[TroubleCode]
    pending: List[TroubleCode]


class VehicleInfoResponse(BaseModel):
    vin: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[str] = None


class PlanResponse(BaseModel):
    plan: Literal["free", "plus", "pro_plus"]


class PlanUpdateRequest(BaseModel):
    plan: Literal["free", "plus", "pro_plus"]


class LikelyCause(BaseModel):
    label: str
    probability: float
    description: Optional[str] = None


class AIDiagnosticCostRange(BaseModel):
    low: float
    high: float
    currency: str = "USD"


class AIExplainRequest(BaseModel):
    codes: List[str]
    vehicle: Optional[dict] = None
    live_data_snapshot: Optional[dict] = None
    # New structured fields
    dtc_codes: Optional[List[str]] = None
    dtc_descriptions: Optional[dict[str, str]] = None
    vehicle_vin: Optional[str] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_year: Optional[int] = None


class AIExplainResponse(BaseModel):
    severity: int  # Renamed from overall_severity to match frontend
    safe_to_drive: bool
    safe_to_drive_reason: Optional[str] = None  # Renamed from safe_to_drive_explanation
    summary: str
    likely_causes: List[LikelyCause]
    estimated_cost_range: dict
    recommended_actions: Optional[List[str]] = None
    raw_model_output: Optional[str] = None  # For debugging


# Billing Models
class CheckoutSessionRequest(BaseModel):
    plan: Literal["plus", "pro_plus"]
    billing_period: Literal["monthly", "yearly"] = "monthly"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    checkout_session_id: str
    checkout_url: str


class BillingConfigResponse(BaseModel):
    stripe_public_key: Optional[str] = None
    billing_enabled: bool


class SubscriptionStatusResponse(BaseModel):
    has_subscription: bool
    subscription_id: Optional[str] = None
    customer_id: Optional[str] = None
    current_plan: Optional[Literal["plus", "pro_plus"]] = None
    current_billing_period: Optional[Literal["monthly", "yearly"]] = None


class PortalSessionRequest(BaseModel):
    return_url: Optional[str] = None


class PortalSessionResponse(BaseModel):
    portal_url: str


# Auth Models
class RegisterRequest(BaseModel):
    email: str
    password: str
    passwordConfirm: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    plan: Literal["free", "plus", "pro_plus"]
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    created: str
    updated: str


class AuthResponse(BaseModel):
    token: str
    user: UserResponse


# Account Management Models
class UpdateUserInfoRequest(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UpdateUserInfoResponse(BaseModel):
    message: str
    user: UserResponse


class ChangePasswordResponse(BaseModel):
    message: str


class SwitchBillingPeriodRequest(BaseModel):
    billing_period: Literal["monthly", "yearly"]


class SwitchBillingPeriodResponse(BaseModel):
    success: bool
    message: str
    subscription_id: Optional[str] = None
    billing_period: Optional[Literal["monthly", "yearly"]] = None

