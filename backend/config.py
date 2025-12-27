import json
import os
from pathlib import Path
from typing import Literal, Optional

CONFIG_FILE = Path(__file__).parent / "config.json"


def load_config() -> dict:
    """Load config from JSON file."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {"plan": "free"}


def save_config(config: dict) -> None:
    """Save config to JSON file."""
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_plan() -> Literal["free", "plus", "pro_plus"]:
    """Get current plan from config."""
    config = load_config()
    return config.get("plan", "free")


def set_plan(plan: Literal["free", "plus", "pro_plus"]) -> None:
    """Set plan in config."""
    config = load_config()
    config["plan"] = plan
    save_config(config)


# Subscription storage functions
def get_subscription_id() -> Optional[str]:
    """Get Stripe subscription ID from config."""
    config = load_config()
    return config.get("subscription_id")


def set_subscription_id(subscription_id: Optional[str]) -> None:
    """Set Stripe subscription ID in config."""
    config = load_config()
    if subscription_id:
        config["subscription_id"] = subscription_id
    else:
        config.pop("subscription_id", None)
    save_config(config)


def get_customer_id() -> Optional[str]:
    """Get Stripe customer ID from config."""
    config = load_config()
    return config.get("customer_id")


def set_customer_id(customer_id: Optional[str]) -> None:
    """Set Stripe customer ID in config."""
    config = load_config()
    if customer_id:
        config["customer_id"] = customer_id
    else:
        config.pop("customer_id", None)
    save_config(config)


def has_active_subscription() -> bool:
    """Check if user has an active subscription."""
    return bool(get_subscription_id() and get_customer_id())


# AI Configuration from environment variables
def get_ai_provider() -> Optional[str]:
    """Get AI provider from environment (e.g., 'openrouter')."""
    return os.getenv("AI_PROVIDER", "openrouter").lower() if os.getenv("AI_PROVIDER") else None


def get_ai_model() -> Optional[str]:
    """Get AI model identifier from environment."""
    return os.getenv("AI_MODEL", "openrouter/bert-nebulon-alpha") or None


def get_openrouter_api_key() -> Optional[str]:
    """Get OpenRouter API key from environment."""
    return os.getenv("OPENROUTER_API_KEY") or None


def get_openrouter_base_url() -> str:
    """Get OpenRouter base URL from environment, with default."""
    return os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


def is_ai_configured() -> bool:
    """Check if AI is properly configured."""
    provider = get_ai_provider()
    if not provider:
        return False
    if provider == "openrouter":
        return bool(get_openrouter_api_key() and get_ai_model())
    return False


# Billing Configuration from environment variables
def get_stripe_public_key() -> Optional[str]:
    """Get Stripe public key from environment."""
    return os.getenv("STRIPE_PUBLIC_KEY") or None


def get_stripe_secret_key() -> Optional[str]:
    """Get Stripe secret key from environment."""
    return os.getenv("STRIPE_SECRET_KEY") or None


def get_stripe_price_id(plan: Literal["plus", "pro_plus"], billing_period: Literal["monthly", "yearly"] = "monthly") -> Optional[str]:
    """Get Stripe price ID for a plan from environment."""
    if plan == "plus":
        if billing_period == "yearly":
            return os.getenv("STRIPE_PRICE_ID_PLUS_YEARLY") or None
        return os.getenv("STRIPE_PRICE_ID_PLUS") or None
    elif plan == "pro_plus":
        if billing_period == "yearly":
            return os.getenv("STRIPE_PRICE_ID_PRO_PLUS_YEARLY") or None
        return os.getenv("STRIPE_PRICE_ID_PRO_PLUS") or None
    return None


def get_stripe_webhook_secret() -> Optional[str]:
    """Get Stripe webhook secret from environment."""
    return os.getenv("STRIPE_WEBHOOK_SECRET") or None


def is_billing_configured() -> bool:
    """Check if billing is properly configured."""
    return bool(get_stripe_public_key() and get_stripe_secret_key())


def is_webhook_configured() -> bool:
    """Check if webhook is properly configured."""
    return bool(get_stripe_webhook_secret())


# Appwrite Configuration from environment variables
def get_appwrite_endpoint() -> Optional[str]:
    """Get Appwrite endpoint URL from environment."""
    return os.getenv("APPWRITE_ENDPOINT") or None


def get_appwrite_project_id() -> Optional[str]:
    """Get Appwrite project ID from environment."""
    return os.getenv("APPWRITE_PROJECT_ID") or None


def get_appwrite_api_key() -> Optional[str]:
    """Get Appwrite API key from environment."""
    return os.getenv("APPWRITE_API_KEY") or None


def get_appwrite_database_id() -> str:
    """Get Appwrite database ID from environment, with default."""
    return os.getenv("APPWRITE_DATABASE_ID", "autoiq")


def get_appwrite_profiles_collection_id() -> str:
    """Get Appwrite profiles collection ID from environment, with default."""
    return os.getenv("APPWRITE_PROFILES_COLLECTION_ID", "profiles")


def is_appwrite_configured() -> bool:
    """Check if Appwrite is properly configured."""
    return bool(get_appwrite_endpoint() and get_appwrite_project_id() and get_appwrite_api_key())

