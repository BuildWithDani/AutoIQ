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
from appwrite_client import get_user_by_id, get_user_by_customer_id, update_profile_plan, get_user_profile

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


def switch_subscription_billing_period(user_id: str, new_billing_period: Literal["monthly", "yearly"]) -> dict:
    """
    Switch existing subscription to different billing period using Stripe's subscription update API.
    
    This updates the existing subscription instead of creating a new one, which:
    - Avoids duplicate subscriptions
    - Handles proration automatically
    - Is more efficient and user-friendly
    
    Args:
        user_id: Appwrite user ID
        new_billing_period: New billing period - "monthly" or "yearly"
    
    Returns:
        Dictionary with success status and message
    
    Raises:
        ValueError: If no active subscription found or billing is not configured
        stripe.error.StripeError: If Stripe API call fails
    """
    if not is_billing_configured():
        raise ValueError("Billing is not configured. Please set STRIPE_SECRET_KEY and STRIPE_PUBLIC_KEY in environment.")
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    
    # Initialize Stripe
    stripe.api_key = secret_key
    
    # Get user's profile to find subscription
    profile = get_user_profile(user_id)
    if not profile:
        raise ValueError(f"User profile not found for user {user_id}")
    
    subscription_id = profile.get("stripeSubscriptionId")
    if not subscription_id:
        raise ValueError("No active subscription found. Please subscribe first.")
    
    # Get current plan from profile
    current_plan = profile.get("plan", "plus")
    if current_plan not in ["plus", "pro_plus"]:
        raise ValueError(f"Cannot switch billing period for plan: {current_plan}. Must be 'plus' or 'pro_plus'.")
    
    # Get the new price ID for the same plan but different billing period
    new_price_id = get_stripe_price_id(current_plan, new_billing_period)
    if not new_price_id:
        period_name = "yearly" if new_billing_period == "yearly" else "monthly"
        env_var = f"STRIPE_PRICE_ID_{current_plan.upper()}{'_YEARLY' if new_billing_period == 'yearly' else ''}"
        raise ValueError(f"STRIPE_PRICE_ID for {current_plan} ({period_name}) is not set. Set {env_var} in environment.")
    
    try:
        # Retrieve the current subscription
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Check if subscription is active
        if subscription.status not in ['active', 'trialing']:
            raise ValueError(f"Cannot switch billing period. Subscription status is: {subscription.status}")
        
        # Get subscription items using SubscriptionItem.list()
        # This is the proper way to retrieve items for a subscription
        items_list = stripe.SubscriptionItem.list(subscription=subscription_id, limit=10)
        items = items_list.data if hasattr(items_list, 'data') else []
        
        if not items:
            raise ValueError("No subscription items found")
        
        subscription_item_id = items[0].id
        
        # Update the subscription with the new price
        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            items=[{
                'id': subscription_item_id,
                'price': new_price_id,
            }],
            proration_behavior='always_invoice',  # Charge immediately for prorated amount
            metadata={
                'user_id': user_id,
                'plan': current_plan,
                'billing_period': new_billing_period,
                'app': 'autoiq',
            }
        )
        
        logger.info(f"Successfully switched subscription {subscription_id} to {new_billing_period} billing for user {user_id}")
        
        return {
            'success': True,
            'message': f'Subscription successfully switched to {new_billing_period} billing',
            'subscription_id': subscription_id,
            'billing_period': new_billing_period,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error switching subscription: {e}")
        raise ValueError(f"Failed to switch subscription billing period: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error switching subscription: {e}")
        raise ValueError(f"Billing service error: {str(e)}")


def get_subscription_details(subscription_id: str) -> Optional[dict]:
    """
    Get subscription details including plan and billing period from Stripe.
    
    Args:
        subscription_id: Stripe subscription ID
    
    Returns:
        Dictionary with 'plan' and 'billing_period', or None if not found
    """
    if not is_billing_configured():
        return None
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        return None
    
    stripe.api_key = secret_key
    
    try:
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get subscription items using SubscriptionItem.list()
        # This is the proper way to retrieve items for a subscription
        items_list = stripe.SubscriptionItem.list(subscription=subscription_id, limit=10)
        items = items_list.data if hasattr(items_list, 'data') else []
        
        if not items:
            return None
        
        # Get price ID and price object (for amount/currency)
        price = items[0].price
        if isinstance(price, str):
            price_obj = stripe.Price.retrieve(price)
            price_id = price_obj.id
        else:
            price_obj = price
            price_id = price.id
        
        # Amount in smallest currency unit (e.g. cents); Stripe uses unit_amount
        amount_cents = getattr(price_obj, 'unit_amount', None) or (price_obj.get('unit_amount') if isinstance(price_obj, dict) else None)
        currency = (getattr(price_obj, 'currency', None) or (price_obj.get('currency') if isinstance(price_obj, dict) else None) or 'usd').lower()
        
        # Determine plan and billing period from price ID
        plus_price_id_monthly = get_stripe_price_id('plus', 'monthly')
        plus_price_id_yearly = get_stripe_price_id('plus', 'yearly')
        pro_plus_price_id_monthly = get_stripe_price_id('pro_plus', 'monthly')
        pro_plus_price_id_yearly = get_stripe_price_id('pro_plus', 'yearly')
        
        plan = None
        billing_period = None
        
        if price_id == plus_price_id_monthly:
            plan = 'plus'
            billing_period = 'monthly'
        elif price_id == plus_price_id_yearly:
            plan = 'plus'
            billing_period = 'yearly'
        elif price_id == pro_plus_price_id_monthly:
            plan = 'pro_plus'
            billing_period = 'monthly'
        elif price_id == pro_plus_price_id_yearly:
            plan = 'pro_plus'
            billing_period = 'yearly'
        
        if plan and billing_period:
            # Include Stripe status and current_period_end (Unix ts -> ISO 8601)
            status = getattr(subscription, 'status', None) or (subscription.get('status') if isinstance(subscription, dict) else None)
            current_period_end = getattr(subscription, 'current_period_end', None) or (subscription.get('current_period_end') if isinstance(subscription, dict) else None)
            current_period_end_iso = None
            if current_period_end is not None:
                from datetime import datetime
                current_period_end_iso = datetime.utcfromtimestamp(current_period_end).isoformat() + 'Z'
            return {
                'plan': plan,
                'billing_period': billing_period,
                'status': status,
                'current_period_end': current_period_end_iso,
                'next_bill_date': current_period_end_iso,  # same as period end; when next charge runs
                'amount_cents': amount_cents,
                'currency': currency,
            }
        
        return None
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error getting subscription details: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting subscription details: {e}")
        return None


def upgrade_subscription(user_id: str, new_plan: Literal["plus", "pro_plus"], new_billing_period: Literal["monthly", "yearly"]) -> dict:
    """
    Upgrade or change subscription plan and/or billing period.
    
    Args:
        user_id: Appwrite user ID
        new_plan: New plan (plus or pro_plus)
        new_billing_period: New billing period (monthly or yearly)
    
    Returns:
        Dictionary with success status and message
    """
    if not is_billing_configured():
        raise ValueError("Billing is not configured.")
    
    secret_key = get_stripe_secret_key()
    if not secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    
    stripe.api_key = secret_key
    
    # Get user's profile
    profile = get_user_profile(user_id)
    if not profile:
        raise ValueError(f"User profile not found for user {user_id}")
    
    subscription_id = profile.get("stripeSubscriptionId")
    if not subscription_id:
        raise ValueError("No active subscription found. Please subscribe first.")
    
    # Get new price ID
    new_price_id = get_stripe_price_id(new_plan, new_billing_period)
    if not new_price_id:
        period_name = "yearly" if new_billing_period == "yearly" else "monthly"
        env_var = f"STRIPE_PRICE_ID_{new_plan.upper()}{'_YEARLY' if new_billing_period == 'yearly' else ''}"
        raise ValueError(f"STRIPE_PRICE_ID for {new_plan} ({period_name}) is not set. Set {env_var} in environment.")
    
    try:
        # Retrieve the current subscription
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        if subscription.status not in ['active', 'trialing']:
            raise ValueError(f"Cannot upgrade subscription. Subscription status is: {subscription.status}")
        
        # Get subscription items using SubscriptionItem.list()
        # This is the proper way to retrieve items for a subscription
        items_list = stripe.SubscriptionItem.list(subscription=subscription_id, limit=10)
        items = items_list.data if hasattr(items_list, 'data') else []
        
        if not items:
            raise ValueError("No subscription items found")
        
        subscription_item_id = items[0].id
        
        # Update the subscription with the new plan/price
        updated_subscription = stripe.Subscription.modify(
            subscription_id,
            items=[{
                'id': subscription_item_id,
                'price': new_price_id,
            }],
            proration_behavior='always_invoice',
            metadata={
                'user_id': user_id,
                'plan': new_plan,
                'billing_period': new_billing_period,
                'app': 'autoiq',
            }
        )
        
        logger.info(f"Successfully upgraded subscription {subscription_id} to {new_plan} ({new_billing_period}) for user {user_id}")
        
        return {
            'success': True,
            'message': f'Subscription successfully upgraded to {new_plan} ({new_billing_period})',
            'subscription_id': subscription_id,
            'plan': new_plan,
            'billing_period': new_billing_period,
        }
    except stripe.error.StripeError as e:
        logger.error(f"Stripe API error upgrading subscription: {e}")
        raise ValueError(f"Failed to upgrade subscription: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error upgrading subscription: {e}")
        raise ValueError(f"Billing service error: {str(e)}")

