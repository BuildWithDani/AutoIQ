"""
Billing Service for AutoIQ using Stripe.
"""
import logging
from typing import Optional, Literal
import stripe
from config import (
    get_stripe_secret_key,
    get_stripe_price_id,
    get_stripe_webhook_secret,
    is_billing_configured,
    is_webhook_configured,
)
from appwrite_client import get_user_by_id, get_user_by_customer_id, update_profile_plan

logger = logging.getLogger(__name__)


def create_checkout_session(user_id: str, plan: Literal["plus", "pro_plus"], success_url: str, cancel_url: str, billing_period: Literal["monthly", "yearly"] = "monthly") -> dict:
    """
    Create a Stripe Checkout Session for subscription.
    
    Args:
        user_id: Appwrite user ID
        plan: The plan to subscribe to (plus or pro_plus)
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect if payment is cancelled
        billing_period: Billing period - "monthly" or "yearly" (default: "monthly")
    
    Returns:
        Dictionary with checkout_session_id and checkout_url
    
    Raises:
        ValueError: If billing is not configured or plan is invalid
        stripe.error.StripeError: If Stripe API call fails
    """
    if not is_billing_configured():
        raise ValueError("Billing is not configured. Please set STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY in environment.")
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    
    price_id = get_stripe_price_id(plan, billing_period)
    if not price_id:
        period_name = "yearly" if billing_period == "yearly" else "monthly"
        env_var = f"STRIPE_PRICE_ID_{plan.upper()}{'_YEARLY' if billing_period == 'yearly' else ''}"
        raise ValueError(f"STRIPE_PRICE_ID for {plan} ({period_name}) is not set. Set {env_var} in environment.")
    
    # Initialize Stripe
    stripe.api_key = secret_key
    
    try:
        # Create Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user_id,
                'plan': plan,
                'billing_period': billing_period,
                'app': 'autoiq',
            },
        )
        
        logger.info(f"Created Stripe Checkout Session {session.id} for plan {plan}")
        
        return {
            'checkout_session_id': session.id,
            'checkout_url': session.url,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error: {e}")
        raise ValueError(f"Failed to create checkout session: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session: {e}")
        raise ValueError(f"Billing service error: {str(e)}")


def verify_webhook_signature(payload: bytes, signature: str) -> dict:
    """
    Verify Stripe webhook signature and return event data.
    
    Args:
        payload: Raw request body as bytes
        signature: Stripe signature from request headers
    
    Returns:
        Parsed Stripe event object
    
    Raises:
        ValueError: If signature verification fails or webhook is not configured
    """
    if not is_webhook_configured():
        raise ValueError("Webhook is not configured. Please set STRIPE_WEBHOOK_SECRET in environment.")
    
    webhook_secret = get_stripe_webhook_secret()
    if not webhook_secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not set")
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    
    # Initialize Stripe
    stripe.api_key = secret_key
    
    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload,
            signature,
            webhook_secret
        )
        logger.info(f"Verified webhook event: {event['type']} (id: {event['id']})")
        return event
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise ValueError(f"Invalid webhook payload: {str(e)}")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Webhook signature verification failed: {e}")
        raise ValueError(f"Webhook signature verification failed: {str(e)}")


def handle_checkout_completed(event: dict) -> None:
    """
    Handle checkout.session.completed event and update Appwrite user profile.
    
    Args:
        event: Stripe event object
    
    Raises:
        ValueError: If plan cannot be extracted or is invalid
    """
    session = event.get('data', {}).get('object', {})
    metadata = session.get('metadata', {})
    plan = metadata.get('plan')
    user_id = metadata.get('user_id')
    
    if not plan:
        raise ValueError("No plan found in checkout session metadata")
    
    if plan not in ['plus', 'pro_plus']:
        raise ValueError(f"Invalid plan in metadata: {plan}. Expected 'plus' or 'pro_plus'")
    
    if not user_id:
        raise ValueError("No user_id found in checkout session metadata")
    
    # Get subscription and customer IDs from the session
    subscription_id = session.get('subscription')
    customer_id = session.get('customer')
    
    # Verify user exists in Appwrite
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError(f"User {user_id} not found in Appwrite")
    
    logger.info(f"Upgrading user {user_id} to plan {plan} from checkout session {session.get('id')}")
    
    # Update user profile in Appwrite with plan and Stripe info
    update_profile_plan(
        user_id=user_id,
        plan=plan,
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id
    )
    
    logger.info(f"Successfully upgraded user {user_id} to plan {plan}")


def create_portal_session(customer_id: str, return_url: str) -> dict:
    """
    Create a Stripe Customer Portal session for subscription management.
    
    Args:
        customer_id: Stripe customer ID
        return_url: URL to return to after managing subscription
    
    Returns:
        Dictionary with portal_url
    
    Raises:
        ValueError: If billing is not configured
    """
    if not is_billing_configured():
        raise ValueError("Billing is not configured. Please set STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY in environment.")
    
    if not customer_id:
        raise ValueError("Customer ID is required.")
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    
    # Initialize Stripe
    stripe.api_key = secret_key
    
    try:
        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        
        logger.info(f"Created portal session for customer {customer_id}")
        
        return {
            'portal_url': portal_session.url,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error: {e}")
        raise ValueError(f"Failed to create portal session: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error creating portal session: {e}")
        raise ValueError(f"Billing service error: {str(e)}")


def handle_subscription_updated(event: dict) -> None:
    """
    Handle customer.subscription.updated event and update Appwrite user profile.
    
    This handles:
    - Plan upgrades/downgrades (when user changes plan in Stripe portal)
    - Subscription status changes (active, canceled, unpaid, past_due, etc.)
    - Trial status changes
    
    Args:
        event: Stripe event object
    
    Raises:
        ValueError: If plan cannot be extracted or is invalid
    """
    subscription = event.get('data', {}).get('object', {})
    subscription_id = subscription.get('id')
    status = subscription.get('status')
    customer_id = subscription.get('customer')
    
    if not customer_id:
        logger.warning(f"No customer_id in subscription {subscription_id}")
        return
    
    # Find user by customer_id
    user = get_user_by_customer_id(customer_id)
    if not user:
        logger.warning(f"User not found for customer_id {customer_id}")
        return
    
    user_id = user.get("$id")
    if not user_id:
        logger.warning(f"No user ID found for customer_id {customer_id}")
        return
    
    # Get the price/item to determine plan
    items = subscription.get('items', {}).get('data', [])
    if not items:
        logger.warning(f"No items found in subscription {subscription_id}")
        return
    
    price_id = items[0].get('price', {}).get('id')
    if not price_id:
        logger.warning(f"No price ID found in subscription {subscription_id}")
        return
    
    # Determine plan from price ID (check both monthly and yearly)
    plus_price_id_monthly = get_stripe_price_id('plus', 'monthly')
    plus_price_id_yearly = get_stripe_price_id('plus', 'yearly')
    pro_plus_price_id_monthly = get_stripe_price_id('pro_plus', 'monthly')
    pro_plus_price_id_yearly = get_stripe_price_id('pro_plus', 'yearly')
    
    plan = None
    if (plus_price_id_monthly and price_id == plus_price_id_monthly) or (plus_price_id_yearly and price_id == plus_price_id_yearly):
        plan = 'plus'
    elif (pro_plus_price_id_monthly and price_id == pro_plus_price_id_monthly) or (pro_plus_price_id_yearly and price_id == pro_plus_price_id_yearly):
        plan = 'pro_plus'
    
    if not plan:
        logger.warning(f"Unknown price ID {price_id} in subscription {subscription_id}")
        return
    
    # Update plan based on subscription status
    # Active subscriptions (including trials) get the paid plan
    if status in ['active', 'trialing']:
        logger.info(f"Updating user {user_id} to plan {plan} from subscription {subscription_id} (status: {status})")
        update_profile_plan(
            user_id=user_id,
            plan=plan,
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id
        )
    # Canceled, unpaid, past_due, or incomplete subscriptions downgrade to free
    elif status in ['canceled', 'unpaid', 'past_due', 'incomplete', 'incomplete_expired']:
        logger.info(f"Subscription {subscription_id} is {status}, downgrading user {user_id} to free")
        update_profile_plan(
            user_id=user_id,
            plan='free',
            stripe_customer_id=customer_id,
            stripe_subscription_id=None  # Clear subscription ID when downgraded
        )
    else:
        # Handle other statuses (paused, etc.) - keep current plan but log
        logger.info(f"Subscription {subscription_id} has status {status}, keeping current plan for user {user_id}")
        # Still update subscription_id to keep it in sync
        update_profile_plan(
            user_id=user_id,
            plan=plan,  # Keep the plan from price ID
            stripe_customer_id=customer_id,
            stripe_subscription_id=subscription_id
        )
    
    logger.info(f"Successfully processed subscription update: {subscription_id} for user {user_id}")


def handle_subscription_deleted(event: dict) -> None:
    """
    Handle customer.subscription.deleted event and downgrade Appwrite user to free.
    
    This is called when a subscription is permanently deleted (not just canceled).
    Canceled subscriptions are handled by handle_subscription_updated.
    
    Args:
        event: Stripe event object
    """
    subscription = event.get('data', {}).get('object', {})
    subscription_id = subscription.get('id')
    customer_id = subscription.get('customer')
    
    if not customer_id:
        logger.warning(f"No customer_id in deleted subscription {subscription_id}")
        return
    
    # Find user by customer_id
    user = get_user_by_customer_id(customer_id)
    if not user:
        logger.warning(f"User not found for customer_id {customer_id}")
        return
    
    user_id = user.get("$id")
    if not user_id:
        logger.warning(f"No user ID found for customer_id {customer_id}")
        return
    
    logger.info(f"Subscription {subscription_id} was permanently deleted, downgrading user {user_id} to free")
    update_profile_plan(
        user_id=user_id,
        plan='free',
        stripe_customer_id=customer_id,  # Keep customer_id for potential future subscriptions
        stripe_subscription_id=None  # Clear subscription ID
    )
    logger.info(f"Successfully downgraded user {user_id} to free plan after subscription deletion")

