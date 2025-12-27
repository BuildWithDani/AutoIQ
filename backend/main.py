# Import compatibility shim first (before any other imports that might use collections)
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
import compat

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from datetime import datetime
import logging
from dotenv import load_dotenv
from typing import Dict, Any

from models import (
    StatusResponse,
    LiveDataResponse,
    CodesResponse,
    TroubleCode,
    VehicleInfoResponse,
    PlanResponse,
    PlanUpdateRequest,
    AIExplainRequest,
    AIExplainResponse,
    LikelyCause,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    BillingConfigResponse,
    SubscriptionStatusResponse,
    PortalSessionRequest,
    PortalSessionResponse,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UserResponse,
    UpdateUserInfoRequest,
    UpdateUserInfoResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
)
from obd_service import OBDService
from config import (
    is_ai_configured,
    is_billing_configured,
    get_stripe_public_key,
)
from ai_service import generate_ai_diagnostic
from billing_service import (
    create_checkout_session,
    verify_webhook_signature,
    handle_checkout_completed,
    create_portal_session,
    handle_subscription_updated,
    handle_subscription_deleted,
)
from appwrite_client import (
    update_profile_plan,
    update_user_info,
    change_user_password,
)
from auth import register_user, authenticate_user, get_current_user_dependency

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AutoIQ Backend", version="0.1.0")

# CORS middleware for Electron
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OBD service
obd_service = OBDService()

# Attempt connection on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AutoIQ backend...")
    obd_service.connect()


# ============================================================================
# AUTH ENDPOINTS
# ============================================================================

@app.post("/api/auth/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """Register a new user."""
    if request.password != request.passwordConfirm:
        raise HTTPException(
            status_code=400,
            detail={"code": "password_mismatch", "message": "Passwords do not match"}
        )
    
    try:
        token, user_info = await register_user(request.email, request.password)
        
        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user_info["id"],
                email=user_info["email"],
                plan=user_info["plan"],
                stripe_customer_id=user_info.get("stripeCustomerId"),
                stripe_subscription_id=user_info.get("stripeSubscriptionId"),
                created=user_info.get("created", ""),
                updated=user_info.get("updated", ""),
            )
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "registration_failed", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"code": "internal_error", "message": "Registration failed"}
        )


@app.post("/api/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """Login user and return JWT token."""
    try:
        result = await authenticate_user(request.email, request.password)
        
        if not result:
            raise HTTPException(
                status_code=401,
                detail={"code": "invalid_credentials", "message": "Invalid email or password"}
            )
        
        token, user_info = result
        
        return AuthResponse(
            token=token,
            user=UserResponse(
                id=user_info["id"],
                email=user_info["email"],
                plan=user_info["plan"],
                stripe_customer_id=user_info.get("stripeCustomerId"),
                stripe_subscription_id=user_info.get("stripeSubscriptionId"),
                created=user_info.get("created", ""),
                updated=user_info.get("updated", ""),
            )
        )
    except ValueError as e:
        # Extract user-friendly message
        error_message = str(e)
        # Determine if it's a credentials issue or account doesn't exist
        if "does not exist" in error_message.lower() or "account" in error_message.lower():
            status_code = 404  # Not found
            code = "account_not_found"
        else:
            status_code = 401  # Unauthorized
            code = "invalid_credentials"
        
        raise HTTPException(
            status_code=status_code,
            detail={"code": code, "message": error_message}
        )
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        # Provide user-friendly error message
        error_message = "Unable to sign in. Please check your credentials and try again."
        if "connection" in str(e).lower():
            error_message = "Unable to connect to the server. Please try again later."
        raise HTTPException(
            status_code=500,
            detail={"code": "internal_error", "message": error_message}
        )


@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get current authenticated user info."""
    return UserResponse(
        id=user.get("id"),
        email=user.get("email"),
        plan=user.get("plan", "free") or "free",
        stripe_customer_id=user.get("stripeCustomerId"),
        stripe_subscription_id=user.get("stripeSubscriptionId"),
        created=user.get("created", ""),
        updated=user.get("updated", ""),
    )


@app.put("/api/account/info", response_model=UpdateUserInfoResponse)
async def update_account_info(
    request: UpdateUserInfoRequest,
    user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Update user account information (email, name)."""
    try:
        user_id = user["id"]
        
        # Update user info in Appwrite
        updated_user = update_user_info(
            user_id,
            email=request.email,
            name=request.name
        )
        
        # Fetch fresh user data with profile from database
        from appwrite_client import get_user_by_id, get_user_profile
        from auth import get_or_create_profile
        
        # Get fresh user data
        fresh_user = get_user_by_id(user_id)
        if not fresh_user:
            raise HTTPException(
                status_code=404,
                detail={"code": "user_not_found", "message": "User not found"}
            )
        
        # Get or create profile to ensure it exists
        profile = get_or_create_profile(user_id)
        
        # Build user info with fresh data from database
        user_info = {
            "id": fresh_user.get("$id"),
            "email": fresh_user.get("email"),
            "plan": profile.get("plan", "free") if profile else "free",
            "stripeCustomerId": profile.get("stripeCustomerId") if profile else None,
            "stripeSubscriptionId": profile.get("stripeSubscriptionId") if profile else None,
            "created": fresh_user.get("$createdAt"),
            "updated": fresh_user.get("$updatedAt"),
        }
        
        return UpdateUserInfoResponse(
            message="Account information updated successfully",
            user=UserResponse(
                id=user_info["id"],
                email=user_info["email"],
                plan=user_info["plan"],
                stripe_customer_id=user_info.get("stripeCustomerId"),
                stripe_subscription_id=user_info.get("stripeSubscriptionId"),
                created=user_info.get("created", ""),
                updated=user_info.get("updated", ""),
            )
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "validation_error", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Failed to update account info: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"code": "internal_error", "message": "Failed to update account information"}
        )


@app.post("/api/account/change-password", response_model=ChangePasswordResponse)
async def change_password(
    request: ChangePasswordRequest,
    user: Dict[str, Any] = Depends(get_current_user_dependency)
):
    """Change user password."""
    try:
        user_id = user["id"]
        user_email = user["email"]
        
        # First, verify the current password by attempting to authenticate
        from appwrite_client import authenticate_user
        try:
            authenticate_user(user_email, request.current_password)
        except ValueError as e:
            if "password" in str(e).lower() or "incorrect" in str(e).lower():
                raise HTTPException(
                    status_code=401,
                    detail={"code": "invalid_password", "message": "Current password is incorrect"}
                )
            raise
        
        # If authentication succeeded, update the password
        change_user_password(user_id, request.new_password)
        
        return ChangePasswordResponse(
            message="Password changed successfully"
        )
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"code": "validation_error", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Failed to change password: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"code": "internal_error", "message": "Failed to change password"}
        )


# ============================================================================
# OBD ENDPOINTS (No auth required - device-level)
# ============================================================================

@app.get("/api/status", response_model=StatusResponse)
async def get_status():
    """Get OBD connection status."""
    is_connected = obd_service.is_connected()
    return StatusResponse(
        connected=is_connected,
        port=obd_service.port if is_connected else None
    )


@app.post("/api/reconnect", response_model=StatusResponse)
async def reconnect():
    """Attempt to reconnect to OBD device."""
    obd_service.disconnect()
    success, port = obd_service.connect()
    return StatusResponse(connected=success, port=port)


@app.get("/api/live-data", response_model=LiveDataResponse)
async def get_live_data():
    """Get live OBD data."""
    data = obd_service.get_live_data()
    return LiveDataResponse(
        rpm=data.get("rpm", "N/A"),
        speed=data.get("speed", "N/A"),
        coolant_temp=data.get("coolant_temp", "N/A"),
        intake_temp=data.get("intake_temp", "N/A"),
        throttle_pos=data.get("throttle_pos", "N/A"),
        timestamp=datetime.utcnow().isoformat()
    )


@app.get("/api/codes", response_model=CodesResponse)
async def get_codes():
    """Get trouble codes."""
    codes = obd_service.get_trouble_codes()
    return CodesResponse(
        stored=[TroubleCode(**code) for code in codes["stored"]],
        pending=[TroubleCode(**code) for code in codes["pending"]]
    )


@app.post("/api/clear-codes")
async def clear_codes():
    """Clear trouble codes."""
    success = obd_service.clear_codes()
    if not success:
        raise HTTPException(status_code=500, detail="Failed to clear codes")
    return {"success": True}


@app.get("/api/vehicle", response_model=VehicleInfoResponse)
async def get_vehicle_info():
    """Get vehicle information."""
    info = obd_service.get_vehicle_info()
    return VehicleInfoResponse(**info)


@app.get("/api/plan", response_model=PlanResponse)
async def get_plan(user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get current user's plan from Appwrite."""
    plan = user.get("plan", "free") or "free"
    
    # When billing is enabled, validate plan matches subscription status
    if is_billing_configured():
        has_sub = bool(user.get("stripe_subscription_id") and user.get("stripe_customer_id"))
        # If user is on paid plan but has no subscription, downgrade to free
        if plan in ['plus', 'pro_plus'] and not has_sub:
            logger.warning(f"User {user.get('id')} on {plan} plan but no active subscription found. Downgrading to free.")
            update_profile_plan(user.get("id"), plan="free")
            plan = "free"
    
    return PlanResponse(plan=plan)


@app.post("/api/plan", response_model=PlanResponse)
async def update_plan(request: PlanUpdateRequest, user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Update user's plan in Appwrite."""
    current_plan = user.get("plan", "free") or "free"
    user_id = user.get("id")
    
    # When billing is enabled, enforce subscription-based plan management
    if is_billing_configured():
        has_sub = bool(user.get("stripe_subscription_id") and user.get("stripe_customer_id"))
        # If user has active subscription, they must use portal to change plans
        if has_sub:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "subscription_active",
                    "message": "Cannot manually change plan with active subscription. Please use the subscription portal to manage your plan."
                }
            )
        # If user is on a paid plan but no subscription stored, they must have subscribed
        elif current_plan in ['plus', 'pro_plus']:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "subscription_active",
                    "message": "Cannot manually change plan when on a paid subscription. Please use the subscription portal to manage your plan."
                }
            )
        # If user tries to upgrade to paid plan without subscription, block it
        elif request.plan in ['plus', 'pro_plus']:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "subscription_required",
                    "message": f"Cannot manually upgrade to {request.plan}. Please subscribe through the upgrade buttons to access paid plans."
                }
            )
    
    update_profile_plan(user_id, plan=request.plan)
    return PlanResponse(plan=request.plan)


@app.post("/api/ai/explain", response_model=AIExplainResponse)
async def explain_codes(request: AIExplainRequest, user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """AI explanation endpoint using OpenRouter."""
    current_plan = user.get("plan", "free") or "free"
    
    # Check plan restrictions
    if current_plan == "free":
        raise HTTPException(
            status_code=402,
            detail={
                "code": "plan_required",
                "message": "AI diagnostics are available with AutoIQ+ (plus) and Pro+ plans."
            }
        )
    
    # Check AI configuration - must be configured
    if not is_ai_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ai_unavailable",
                "message": "AI diagnostics are not configured yet. Please contact support or configure OPENROUTER_API_KEY."
            }
        )
    
    try:
        # Generate AI diagnostic
        response = await generate_ai_diagnostic(request, current_plan)
        return response
    except ValueError as e:
        logger.error(f"AI service error: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "code": "ai_error",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in AI endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "internal_error",
                "message": "An unexpected error occurred while generating AI diagnostics."
            }
        )


@app.get("/api/billing/config", response_model=BillingConfigResponse)
async def get_billing_config():
    """Get billing configuration (public info only)."""
    return BillingConfigResponse(
        stripe_public_key=get_stripe_public_key(),
        billing_enabled=is_billing_configured(),
    )


@app.post("/api/billing/create-checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout(request: CheckoutSessionRequest, user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Create a Stripe Checkout Session for subscription."""
    if not is_billing_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "billing_unavailable",
                "message": "Billing is not yet configured. Please contact support."
            }
        )
    
    # Default URLs if not provided
    success_url = request.success_url or "https://buildwithdani.com/autoiq/payment-success"
    cancel_url = request.cancel_url or "https://buildwithdani.com/autoiq/payment-cancel"
    
    try:
        result = create_checkout_session(user.get("id"), request.plan, success_url, cancel_url, request.billing_period)
        return CheckoutSessionResponse(**result)
    except ValueError as e:
        logger.error(f"Billing service error: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "code": "billing_error",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in billing endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "internal_error",
                "message": "An unexpected error occurred while creating checkout session."
            }
        )


@app.get("/api/billing/subscription-status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Get subscription status for current user."""
    has_sub = bool(user.get("stripe_subscription_id") and user.get("stripe_customer_id"))
    return SubscriptionStatusResponse(
        has_subscription=has_sub,
        subscription_id=user.get("stripe_subscription_id"),
        customer_id=user.get("stripe_customer_id"),
    )


@app.post("/api/billing/create-portal-session", response_model=PortalSessionResponse)
async def create_portal(request: PortalSessionRequest, user: Dict[str, Any] = Depends(get_current_user_dependency)):
    """Create a Stripe Customer Portal session for subscription management."""
    if not is_billing_configured():
        raise HTTPException(
            status_code=503,
            detail={
                "code": "billing_unavailable",
                "message": "Billing is not yet configured. Please contact support."
            }
        )
    
    if not user.get("stripe_customer_id"):
        raise HTTPException(
            status_code=404,
            detail={
                "code": "no_subscription",
                "message": "No active subscription found. Please subscribe first."
            }
        )
    
    # Default return URL if not provided
    return_url = request.return_url or "https://buildwithdani.com/autoiq/subscription-managed"
    
    try:
        result = create_portal_session(user.get("stripe_customer_id"), return_url)
        return PortalSessionResponse(**result)
    except ValueError as e:
        logger.error(f"Billing service error: {e}")
        raise HTTPException(
            status_code=503,
            detail={
                "code": "billing_error",
                "message": str(e)
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error in portal endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "internal_error",
                "message": "An unexpected error occurred while creating portal session."
            }
        )


@app.post("/api/billing/webhook")
async def stripe_webhook(request: Request):
    """
    Stripe webhook endpoint for handling payment events.
    
    Handles:
    - checkout.session.completed: Automatically upgrades plan when user completes checkout
    - customer.subscription.created: Handles new subscription creation
    - customer.subscription.updated: Updates plan when subscription changes (upgrades, downgrades, status changes)
    - customer.subscription.deleted: Downgrades to free when subscription is permanently deleted
    
    All subscription changes are automatically synced with the database profile.
    """
    # Get raw body for signature verification
    body = await request.body()
    signature = request.headers.get("stripe-signature")
    
    if not signature:
        logger.error("Missing stripe-signature header")
        raise HTTPException(
            status_code=400,
            detail={"code": "missing_signature", "message": "Missing stripe-signature header"}
        )
    
    try:
        # Verify webhook signature and get event
        event = verify_webhook_signature(body, signature)
        
        # Handle different event types
        event_type = event.get("type")
        
        if event_type == "checkout.session.completed":
            try:
                handle_checkout_completed(event)
                logger.info(f"Successfully processed {event_type} event (id: {event.get('id')})")
                return Response(status_code=200, content="OK")
            except ValueError as e:
                logger.error(f"Error handling checkout.completed: {e}")
                raise HTTPException(
                    status_code=400,
                    detail={"code": "processing_error", "message": str(e)}
                )
        elif event_type == "customer.subscription.created":
            # New subscription created - handle same as updated
            try:
                handle_subscription_updated(event)
                logger.info(f"Successfully processed {event_type} event (id: {event.get('id')})")
                return Response(status_code=200, content="OK")
            except ValueError as e:
                logger.error(f"Error handling subscription.created: {e}")
                raise HTTPException(
                    status_code=400,
                    detail={"code": "processing_error", "message": str(e)}
                )
        elif event_type == "customer.subscription.updated":
            try:
                handle_subscription_updated(event)
                logger.info(f"Successfully processed {event_type} event (id: {event.get('id')})")
                return Response(status_code=200, content="OK")
            except ValueError as e:
                logger.error(f"Error handling subscription.updated: {e}")
                raise HTTPException(
                    status_code=400,
                    detail={"code": "processing_error", "message": str(e)}
                )
        elif event_type == "customer.subscription.deleted":
            try:
                handle_subscription_deleted(event)
                logger.info(f"Successfully processed {event_type} event (id: {event.get('id')})")
                return Response(status_code=200, content="OK")
            except ValueError as e:
                logger.error(f"Error handling subscription.deleted: {e}")
                raise HTTPException(
                    status_code=400,
                    detail={"code": "processing_error", "message": str(e)}
                )
        else:
            # Log unhandled events but return 200 to acknowledge receipt
            logger.info(f"Received unhandled event type: {event_type} (id: {event.get('id')})")
            return Response(status_code=200, content="Event received but not handled")
            
    except ValueError as e:
        logger.error(f"Webhook verification error: {e}")
        raise HTTPException(
            status_code=400,
            detail={"code": "verification_error", "message": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error in webhook endpoint: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"code": "internal_error", "message": "An unexpected error occurred processing webhook"}
        )


@app.get("/")
async def root():
    """Health check."""
    return {"status": "ok", "service": "AutoIQ Backend"}

