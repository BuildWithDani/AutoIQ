import { useEffect, useState } from 'react';
import { apiClient } from '../api';
import type { Plan, StatusResponse, BillingConfigResponse, SubscriptionStatusResponse } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../components/ActivityLog';
import ActivityLog from '../components/ActivityLog';
import BuildWithDaniBadge from '../components/BuildWithDaniBadge';
import AccountManagementSection from '../components/AccountManagementSection';

// Window interface is defined in vite-env.d.ts
// Type assertion helper for Electron API
const getElectron = () => (window as any).electron;

export default function Settings({
  onPlanChange,
}: {
  onPlanChange?: () => void;
}) {
  const { user, refreshUser } = useAuth();
  const plan = user?.plan || 'free';
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [billingConfig, setBillingConfig] = useState<BillingConfigResponse | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusResponse | null>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const { showToast } = useToast();
  
  // Backend connection statuses
  const [railwayBackendStatus, setRailwayBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [localBackendStatus, setLocalBackendStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [checkingRailway, setCheckingRailway] = useState(false);
  const [checkingLocal, setCheckingLocal] = useState(false);
  
  // Developer Tools password protection
  const [devToolsUnlocked, setDevToolsUnlocked] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [showDevPasswordPrompt, setShowDevPasswordPrompt] = useState(false);
  
  // Check if developer tools are unlocked in session storage
  useEffect(() => {
    const unlocked = sessionStorage.getItem('autoiq_dev_tools_unlocked') === 'true';
    setDevToolsUnlocked(unlocked);
  }, []);

  useEffect(() => {
    loadStatus();
    loadBillingConfig();
    loadSubscriptionStatus();
    // Check backend connections on mount
    checkRailwayBackend();
    checkLocalBackend();
  }, []);

  // Check backend connections periodically
  useEffect(() => {
    const interval = setInterval(() => {
      checkRailwayBackend();
      checkLocalBackend();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const status = await apiClient.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
      setSubscriptionStatus({ has_subscription: false, subscription_id: null, customer_id: null });
    }
  };

  const loadBillingConfig = async () => {
    try {
      const config = await apiClient.getBillingConfig();
      setBillingConfig(config);
    } catch (error) {
      console.error('Failed to load billing config:', error);
      // Set default if billing is not available
      setBillingConfig({ stripe_public_key: null, billing_enabled: false });
    }
  };

  // Poll for subscription updates after checkout
  const pollForSubscriptionUpdate = async () => {
    const maxAttempts = 20; // Poll for up to 100 seconds (20 * 5 seconds) - webhooks can be slow
    let attempts = 0;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const poll = async () => {
      try {
        attempts++;
        console.log(`Polling for subscription update (attempt ${attempts}/${maxAttempts})...`);
        
        // Refresh subscription status and user data
        await loadSubscriptionStatus();
        await refreshUser();
        
        // Check if subscription was updated by checking both subscription status and user plan
        const updatedStatus = await apiClient.getSubscriptionStatus();
        const currentUser = await apiClient.getCurrentUser();
        
        // Check if we have a subscription OR if the plan has been upgraded
        if (updatedStatus.has_subscription || (currentUser.plan !== 'free' && currentUser.plan !== plan)) {
          showToast('Subscription updated successfully!', 'success');
          logActivity('subscription', `Subscription activated - Plan: ${currentUser.plan}`);
          if (onPlanChange) onPlanChange();
          if (pollInterval) clearTimeout(pollInterval);
          return; // Success, stop polling
        }
        
        // Continue polling if not updated yet
        if (attempts < maxAttempts) {
          pollInterval = setTimeout(poll, 5000); // Poll every 5 seconds
        } else {
          showToast('Subscription update is taking longer than expected. The webhook may be delayed. Please refresh the page in a moment.', 'warning');
          if (pollInterval) clearTimeout(pollInterval);
        }
      } catch (error) {
        console.error('Error polling for subscription update:', error);
        if (attempts < maxAttempts) {
          pollInterval = setTimeout(poll, 5000);
        } else {
          if (pollInterval) clearTimeout(pollInterval);
        }
      }
    };
    
    // Start polling after a short delay to allow webhook to process
    pollInterval = setTimeout(poll, 3000);
  };

  const handleUpgrade = async (targetPlan: 'plus' | 'pro_plus') => {
    if (!billingConfig?.billing_enabled) {
      showToast('Billing is not yet configured. Please contact support.', 'warning');
      return;
    }

    // If user already has a subscription, they should use the portal to change plans
    if (subscriptionStatus?.has_subscription) {
      showToast('You already have an active subscription. Please use the "Manage Subscription" button to change your plan.', 'info');
      return;
    }

    setLoadingBilling(true);
    try {
      // Use proper URLs for Stripe - use backend defaults which are valid HTTPS URLs
      const successUrl = 'https://buildwithdani.com/autoiq/payment-success';
      const cancelUrl = 'https://buildwithdani.com/autoiq/payment-cancel';
      
      const result = await apiClient.createCheckoutSession({
        plan: targetPlan,
        billing_period: billingPeriod,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Open Stripe checkout in app window if available, otherwise use external browser
      const electron = getElectron();
      if (electron?.openCheckout) {
        showToast('Opening payment page...', 'info');
        logActivity('upgrade', `Initiated upgrade to ${targetPlan}`);
        
        const checkoutResult = await electron.openCheckout(
          result.checkout_url,
          successUrl,
          cancelUrl
        );
        
        if (checkoutResult.success) {
          showToast('Payment successful! Updating subscription...', 'success');
          logActivity('payment', `Payment successful for ${targetPlan} subscription`);
          // Immediately refresh user data
          await refreshUser();
          await loadSubscriptionStatus();
          // Poll for subscription update (webhook may take a few seconds)
          pollForSubscriptionUpdate();
        } else if (checkoutResult.cancelled) {
          showToast('Payment cancelled', 'info');
        } else if (checkoutResult.closed) {
          showToast('Payment window closed', 'info');
        }
      } else if (electron?.openExternal) {
        // Fallback to external browser
        await electron.openExternal(result.checkout_url);
        showToast('Opening payment page in your browser...', 'info');
        logActivity('upgrade', `Initiated upgrade to ${targetPlan}`);
        // Poll for subscription update after a delay
        setTimeout(() => pollForSubscriptionUpdate(), 5000);
      } else {
        // Fallback: open in new window
        window.open(result.checkout_url, '_blank', 'noopener,noreferrer');
        showToast('Payment page opened in new window', 'info');
        // Poll for subscription update after a delay
        setTimeout(() => pollForSubscriptionUpdate(), 5000);
      }
    } catch (error: any) {
      console.error('Failed to create checkout session - Full error:', error);
      console.error('Error response:', error?.response);
      console.error('Error response data:', error?.response?.data);
      
      // Extract error message from various possible error formats
      let errorMessage = 'Failed to create checkout session';
      
      // Try to extract from response.data.detail (FastAPI error format)
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          // FastAPI returns {code: "...", message: "..."}
          if (detail.message) {
            errorMessage = detail.message;
          } else if (detail.detail) {
            errorMessage = detail.detail;
          } else if (detail.code) {
            errorMessage = detail.code;
          }
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('Extracted error message:', errorMessage);
      
      // Show user-friendly error messages
      if (errorMessage.includes('BILLING_UNAVAILABLE') || errorMessage.includes('billing_unavailable')) {
        showToast('Billing is not yet configured. Please contact support.', 'error');
      } else if (errorMessage.includes('STRIPE_PRICE_ID') || errorMessage.includes('price ID') || errorMessage.includes('is not set')) {
        const period = billingPeriod === 'yearly' ? 'yearly' : 'monthly';
        showToast(`${period.charAt(0).toUpperCase() + period.slice(1)} pricing is not configured. Please contact support or try ${period === 'yearly' ? 'monthly' : 'yearly'} billing.`, 'error');
      } else if (errorMessage.includes('STRIPE_SECRET_KEY') || errorMessage.includes('not configured')) {
        showToast('Billing configuration is incomplete. Please contact support.', 'error');
      } else {
        // Show the actual error message (truncated if too long)
        const displayMessage = errorMessage.length > 150 ? errorMessage.substring(0, 150) + '...' : errorMessage;
        showToast(displayMessage, 'error');
      }
    } finally {
      setLoadingBilling(false);
    }
  };

  const loadStatus = async () => {
    try {
      const response = await apiClient.getStatus();
      setStatus(response);
      // Update local backend status based on OBD connection
      setLocalBackendStatus(response?.connected ? 'connected' : 'disconnected');
    } catch (error) {
      console.error('Failed to load status:', error);
      setLocalBackendStatus('disconnected');
    }
  };

  const checkRailwayBackend = async () => {
    if (checkingRailway) return;
    setCheckingRailway(true);
    try {
      // Try to fetch billing config as a health check
      await apiClient.getBillingConfig();
      setRailwayBackendStatus('connected');
    } catch (error) {
      console.error('Railway backend check failed:', error);
      setRailwayBackendStatus('disconnected');
    } finally {
      setCheckingRailway(false);
    }
  };

  const checkLocalBackend = async () => {
    if (checkingLocal) return;
    setCheckingLocal(true);
    try {
      const response = await apiClient.getStatus();
      setLocalBackendStatus(response?.connected ? 'connected' : 'disconnected');
      setStatus(response);
    } catch (error) {
      console.error('Local backend check failed:', error);
      setLocalBackendStatus('disconnected');
    } finally {
      setCheckingLocal(false);
    }
  };

  const handlePlanChange = async (newPlan: 'free' | 'plus' | 'pro_plus') => {
    if (newPlan === plan) return;
    
    // When billing is enabled, enforce subscription-based plan management
    if (billingConfig?.billing_enabled) {
      // Prevent changes if user has active subscription or is on paid plan
      if (subscriptionStatus?.has_subscription || (plan === 'plus' || plan === 'pro_plus')) {
        showToast('Cannot change plan manually with active subscription. Please use the subscription portal to manage your plan.', 'warning');
        return;
      }
      // Prevent upgrading to paid plans without subscription
      if ((newPlan === 'plus' || newPlan === 'pro_plus') && !subscriptionStatus?.has_subscription) {
        showToast(`Cannot manually upgrade to ${newPlan === 'plus' ? 'AutoIQ+' : 'Pro+'}. Please use the upgrade buttons below to subscribe.`, 'warning');
        return;
      }
    }
    
    setSaving(true);
    try {
      await apiClient.updatePlan(newPlan);
      await refreshUser(); // Refresh user data to get updated plan
      if (onPlanChange) onPlanChange();
      const planName = newPlan === 'free' ? 'Free' : newPlan === 'plus' ? 'AutoIQ+' : 'Pro+';
      showToast(`Plan updated to ${planName}`, 'success');
      logActivity('plan_change', `Plan changed to ${planName}`);
    } catch (error: any) {
      console.error('Failed to update plan:', error);
      const errorMessage = error?.response?.data?.detail?.message || error?.message || 'Failed to update plan';
      if (errorMessage.includes('subscription_active') || errorMessage.includes('subscription_required')) {
        if (errorMessage.includes('subscription_required')) {
          showToast(errorMessage, 'warning');
        } else {
          showToast('Cannot change plan manually with active subscription. Please use the subscription portal.', 'warning');
        }
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!billingConfig?.billing_enabled || !subscriptionStatus?.has_subscription) {
      showToast('No active subscription found.', 'warning');
      return;
    }

    setLoadingBilling(true);
    try {
      // Use a return URL that we can detect
      const returnUrl = 'https://buildwithdani.com/autoiq/subscription-managed';
      
      const result = await apiClient.createPortalSession({
        return_url: returnUrl,
      });

      // Open Stripe portal in app window if available
      const electron = getElectron();
      if (electron?.openPortal) {
        showToast('Opening subscription management portal...', 'info');
        logActivity('subscription', 'Opened subscription management portal');
        
        const portalResult = await electron.openPortal(
          result.portal_url,
          returnUrl
        );
        
        if (portalResult.completed) {
          showToast('Subscription updated successfully!', 'success');
          logActivity('subscription', 'Subscription management completed');
          // Immediately refresh user data and subscription status
          await loadSubscriptionStatus();
          await refreshUser();
          if (onPlanChange) onPlanChange();
        } else if (portalResult.closed) {
          showToast('Portal closed', 'info');
          // Still refresh in case changes were made
          setTimeout(async () => {
            await loadSubscriptionStatus();
            await refreshUser();
            if (onPlanChange) onPlanChange();
          }, 2000);
        }
      } else if (electron?.openExternal) {
        // Fallback: open in external browser
        await electron.openExternal(result.portal_url);
        showToast('Opening subscription management portal...', 'info');
        logActivity('subscription', 'Opened subscription management portal');
        // Reload subscription status and user data after a delay
        setTimeout(async () => {
          await loadSubscriptionStatus();
          await refreshUser();
          if (onPlanChange) onPlanChange();
        }, 3000);
      } else {
        // Fallback: open in new window
        window.open(result.portal_url, '_blank', 'noopener,noreferrer');
        showToast('Subscription portal opened in new window', 'info');
        // Reload subscription status and user data after a delay
        setTimeout(async () => {
          await loadSubscriptionStatus();
          await refreshUser();
          if (onPlanChange) onPlanChange();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Failed to create portal session:', error);
      const errorMessage = error?.response?.data?.detail?.message || error?.message || 'Failed to open subscription portal';
      
      // Handle specific error cases
      if (errorMessage.includes('NO_SUBSCRIPTION') || errorMessage.includes('no_subscription')) {
        showToast('No active subscription found. Please subscribe first.', 'error');
      } else if (errorMessage.includes('subscription_syncing') || errorMessage.includes('being processed')) {
        showToast('Subscription is being processed. Please wait a moment and try again.', 'warning');
        // Auto-refresh subscription status after a delay
        setTimeout(async () => {
          await loadSubscriptionStatus();
          await refreshUser();
        }, 5000);
      } else {
        showToast(errorMessage, 'error');
      }
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleUpgradeSubscription = async (newPlan: 'plus' | 'pro_plus', newBillingPeriod: 'monthly' | 'yearly') => {
    setLoadingBilling(true);
    try {
      await apiClient.upgradeSubscription({
        plan: newPlan,
        billing_period: newBillingPeriod,
      });
      showToast(`Successfully upgraded to ${newPlan === 'plus' ? 'AutoIQ+' : 'Pro+'} ${newBillingPeriod === 'monthly' ? 'Monthly' : 'Yearly'}!`, 'success');
      // Refresh user data and subscription status
      await refreshUser();
      await loadSubscriptionStatus();
      if (onPlanChange) {
        onPlanChange();
      }
    } catch (error: any) {
      console.error('Upgrade subscription error:', error);
      let errorMessage = 'Failed to upgrade subscription. Please try again.';
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object') {
          if (detail.message) {
            errorMessage = detail.message;
          } else if (detail.detail) {
            errorMessage = detail.detail;
          } else if (detail.code) {
            errorMessage = detail.code;
          }
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleSwitchBillingPeriod = async (newBillingPeriod: 'monthly' | 'yearly') => {
    if (!billingConfig?.billing_enabled || !subscriptionStatus?.has_subscription) {
      showToast('No active subscription found.', 'warning');
      return;
    }

    if (plan !== 'plus' && plan !== 'pro_plus') {
      showToast('You must have an active subscription to switch billing periods.', 'warning');
      return;
    }

    setLoadingBilling(true);
    try {
      const periodText = newBillingPeriod === 'monthly' ? 'Monthly' : 'Yearly';
      
      showToast(`Switching to ${periodText} billing...`, 'info');
      logActivity('subscription', `Initiating switch to ${periodText} billing`);

      // Use the new API endpoint that updates the existing subscription
      const result = await apiClient.switchBillingPeriod({
        billing_period: newBillingPeriod,
      });

      if (result.success) {
        showToast(`Successfully switched to ${periodText} billing!`, 'success');
        logActivity('subscription', `Successfully switched to ${periodText} billing`);
        
        // Immediately refresh user data and subscription status
        await refreshUser();
        await loadSubscriptionStatus();
        
        // The subscription update happens immediately via Stripe API,
        // but we'll poll briefly to ensure webhook has processed
        setTimeout(async () => {
          await refreshUser();
          await loadSubscriptionStatus();
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to switch billing period');
      }
    } catch (error: any) {
      console.error('Failed to switch billing period:', error);
      const errorMessage = error?.message || error?.response?.data?.detail?.message || 'Failed to switch billing period';
      showToast(errorMessage, 'error');
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleReconnect = async () => {
    try {
      const response = await apiClient.reconnect();
      setStatus(response);
      if (response.connected) {
        showToast('Reconnected successfully', 'success');
        logActivity('reconnect', 'Backend reconnected successfully');
      } else {
        showToast('Failed to reconnect', 'error');
      }
    } catch (error) {
      console.error('Failed to reconnect:', error);
      showToast('Failed to reconnect', 'error');
    }
  };

  const handleUnlockDevTools = () => {
    // Developer password - can be set via environment variable or use default
    const correctPassword = import.meta.env.VITE_DEV_PASSWORD || 'BWD2024';
    
    if (devPassword === correctPassword) {
      setDevToolsUnlocked(true);
      setShowDevPasswordPrompt(false);
      setDevPassword('');
      sessionStorage.setItem('autoiq_dev_tools_unlocked', 'true');
      showToast('Developer tools unlocked', 'success');
    } else {
      showToast('Incorrect password', 'error');
      setDevPassword('');
    }
  };

  const planFeatures = {
    free: [
      'Code scanning and reading',
      'Basic live data monitoring',
      'Clear trouble codes',
      'Vehicle information',
    ],
    plus: [
      'Everything in Free',
      'AI-powered diagnostics',
      'Repair recommendations',
      'Cost estimates',
      'Advanced live data analytics',
    ],
    pro_plus: [
      'Everything in AutoIQ+',
      'Advanced diagnostics',
      'Shop/mechanic features',
      'Data export and reports',
      'Priority support',
      'Advanced features (coming soon)',
    ],
  };

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Account Management */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Account Information</h3>
            <p className="text-sm text-gray-600 mt-1">Manage your account details and security</p>
          </div>
          <AccountManagementSection />
        </div>

        {/* Plan Selection */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Subscription Plan</h3>
              <p className="text-sm text-gray-600 mt-1">Choose the plan that fits your needs</p>
            </div>
            <button
              onClick={() => setShowPlanComparison(!showPlanComparison)}
              className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-50"
            >
              {showPlanComparison ? 'Hide' : 'Compare'} Plans
            </button>
          </div>

          {showPlanComparison && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['free', 'plus', 'pro_plus'] as Plan[]).map((p) => {
                const pricing = {
                  free: { monthly: '$0', yearly: '$0', bestFor: 'Basic users' },
                  plus: { monthly: '$7.99', yearly: '$79', bestFor: 'Daily drivers & car lovers' },
                  pro_plus: { monthly: '$19.99', yearly: '$199', bestFor: 'Mechanics & shop owners' },
                };
                const planPricing = pricing[p];
                
                return (
                  <div
                    key={p}
                    className={`border-2 rounded-xl p-5 transition-all ${
                      p === plan
                        ? 'border-primary-500 bg-primary-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-lg">
                        {p === 'free' ? 'Free' : p === 'plus' ? 'AutoIQ+' : 'Pro+'}
                      </div>
                      {p === plan && (
                        <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-900 mb-1">
                        {planPricing.monthly}
                        <span className="text-sm font-normal text-gray-600">/month</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {planPricing.yearly}/year
                      </div>
                      <div className="text-xs text-gray-500 mt-2 italic">
                        Best for: {planPricing.bestFor}
                      </div>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {planFeatures[p].map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">✓</span>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            <div className="text-sm text-gray-600 mb-4">
              Current plan: <span className="font-semibold text-gray-900">{plan === 'free' ? 'Free' : plan === 'plus' ? 'AutoIQ+' : 'Pro+'}</span>
              {subscriptionStatus?.has_subscription && (
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  Active Subscription
                </span>
              )}
            </div>
            
            {billingConfig?.billing_enabled && (subscriptionStatus?.has_subscription || plan === 'plus' || plan === 'pro_plus') ? (
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900 mb-3">
                    <strong>Active Subscription:</strong> You have an active subscription. To change your plan, please use the subscription management portal.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleManageSubscription}
                      disabled={loadingBilling || !subscriptionStatus?.has_subscription}
                      className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingBilling ? 'Opening Portal...' : subscriptionStatus?.has_subscription ? 'Manage Subscription' : 'Subscription Portal Unavailable'}
                    </button>
                    {!subscriptionStatus?.has_subscription && (
                      <button
                        onClick={async () => {
                          setLoadingBilling(true);
                          try {
                            await loadSubscriptionStatus();
                            await refreshUser();
                            showToast('Subscription status refreshed', 'success');
                          } catch (error) {
                            showToast('Failed to refresh status', 'error');
                          } finally {
                            setLoadingBilling(false);
                          }
                        }}
                        disabled={loadingBilling}
                        className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh subscription status"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  {!subscriptionStatus?.has_subscription && (
                    <p className="text-xs text-blue-700 mt-2">
                      Note: Subscription management requires both customer ID and subscription ID. If you just subscribed, please wait a moment for the system to process, or click the refresh button above.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex gap-3">
                  {(['free', 'plus', 'pro_plus'] as Plan[]).map((p) => {
                    // Disable buttons if:
                    // 1. Currently saving
                    // 2. Already on this plan
                    // 3. Billing enabled AND:
                    //    - Has subscription OR on paid plan (can't change)
                    //    - Trying to upgrade to paid plan without subscription (must use checkout)
                    const isDisabled = saving || plan === p || 
                      (billingConfig?.billing_enabled && (
                        subscriptionStatus?.has_subscription || 
                        plan === 'plus' || 
                        plan === 'pro_plus' ||
                        ((p === 'plus' || p === 'pro_plus') && !subscriptionStatus?.has_subscription)
                      ));
                    
                    return (
                      <button
                        key={p}
                        onClick={() => handlePlanChange(p)}
                        disabled={isDisabled}
                        className={`flex-1 px-6 py-4 rounded-xl transition-all font-medium ${
                          plan === p
                            ? 'bg-primary-600 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={
                          billingConfig?.billing_enabled && (p === 'plus' || p === 'pro_plus') && !subscriptionStatus?.has_subscription
                            ? `Use the upgrade button below to subscribe to ${p === 'plus' ? 'AutoIQ+' : 'Pro+'}`
                            : undefined
                        }
                      >
                        {p === 'free' ? 'Free' : p === 'plus' ? 'AutoIQ+' : 'Pro+'}
                      </button>
                    );
                  })}
                </div>
                {billingConfig?.billing_enabled ? (
                  <div className="text-xs text-gray-500 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <strong>Note:</strong> Real billing is enabled. Use the upgrade buttons below to subscribe.
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <strong>Note:</strong> Billing is currently disabled. Contact support to enable subscription management.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Developer Section - Password Protected */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Developer Tools</h3>
            {devToolsUnlocked && (
              <button
                onClick={() => {
                  setDevToolsUnlocked(false);
                  setShowDevPasswordPrompt(false);
                  sessionStorage.removeItem('autoiq_dev_tools_unlocked');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Lock
              </button>
            )}
          </div>
          
          {!devToolsUnlocked ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  This section contains sensitive developer information and is password protected.
                </p>
                {!showDevPasswordPrompt ? (
                  <button
                    onClick={() => setShowDevPasswordPrompt(true)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                  >
                    Unlock Developer Tools
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Enter Developer Password
                      </label>
                      <input
                        type="password"
                        value={devPassword}
                        onChange={(e) => setDevPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleUnlockDevTools();
                          }
                        }}
                        placeholder="Enter password"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleUnlockDevTools}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                      >
                        Unlock
                      </button>
                      <button
                        onClick={() => {
                          setShowDevPasswordPrompt(false);
                          setDevPassword('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Railway Backend (Public SaaS) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Railway Backend (Public SaaS)
                </label>
                <input
                  type="text"
                  value={typeof window !== 'undefined' && (window as any).electron?.railwayUrl || import.meta.env.VITE_RAILWAY_API_URL || 'https://autoiq-production.up.railway.app'}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm mb-3"
                />
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {railwayBackendStatus === 'checking' ? (
                      <>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">Checking connection...</span>
                      </>
                    ) : railwayBackendStatus === 'connected' ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">Connected</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">Not connected</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={checkRailwayBackend}
                    disabled={checkingRailway}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingRailway ? 'Checking...' : 'Recheck Connection'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used for: Authentication, Billing, AI Diagnostics, Account Management
                </p>
              </div>

              {/* Local Backend (OBD) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Local Backend (OBD Device)
                </label>
                <input
                  type="text"
                  value={typeof window !== 'undefined' && (window as any).electron?.localUrl || import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001'}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm mb-3"
                />
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {localBackendStatus === 'checking' ? (
                      <>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">Checking connection...</span>
                      </>
                    ) : localBackendStatus === 'connected' ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">
                          {status?.connected ? (
                            <>Connected on <span className="font-mono font-semibold">{status.port}</span></>
                          ) : (
                            'Connected'
                          )}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-gray-700">Not connected</span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      await checkLocalBackend();
                      if (status && !status.connected) {
                        handleReconnect();
                      }
                    }}
                    disabled={checkingLocal}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkingLocal ? 'Checking...' : 'Reconnect Backend'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Used for: OBD Device Connection, Live Data, Trouble Codes, Vehicle Info
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Account & Billing */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Account & Billing</h3>
          
          {billingConfig?.billing_enabled ? (
            <div className="space-y-4">
              {(subscriptionStatus?.has_subscription || plan === 'plus' || plan === 'pro_plus') && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-green-900 mb-1">Active Subscription</div>
                        <div className="text-sm text-green-700">
                          {subscriptionStatus?.current_plan && subscriptionStatus?.current_billing_period ? (
                            <>
                              Current Subscription: <strong>
                                {subscriptionStatus.current_plan === 'plus' ? 'AutoIQ+' : 'Pro+'} 
                                {' '}
                                {subscriptionStatus.current_billing_period === 'monthly' ? 'Monthly' : 'Yearly'}
                              </strong>
                            </>
                          ) : (
                            <>
                              You are currently on the <strong>{plan === 'plus' ? 'AutoIQ+' : 'Pro+'}</strong> plan.
                            </>
                          )}
                          {subscriptionStatus?.subscription_id && (
                            <div className="mt-1 text-xs text-green-600">
                              Subscription ID: {subscriptionStatus.subscription_id.substring(0, 20)}...
                            </div>
                          )}
                          {!subscriptionStatus?.has_subscription && (
                            <div className="mt-1 text-xs text-yellow-600">
                              Note: Subscription details are being synced. If you just subscribed, please wait a moment.
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleManageSubscription}
                        disabled={loadingBilling || !subscriptionStatus?.has_subscription}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {loadingBilling ? 'Opening...' : subscriptionStatus?.has_subscription ? 'Manage Subscription' : 'Portal Unavailable'}
                      </button>
                    </div>
                  </div>

                  {/* Billing Period Switcher & Upgrade Options for Active Subscriptions */}
                  {subscriptionStatus?.has_subscription && (plan === 'plus' || plan === 'pro_plus') && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-bold text-blue-900 mb-1">Switch Billing Period & Upgrade</h4>
                          <p className="text-sm text-blue-700">
                            {subscriptionStatus?.current_plan && subscriptionStatus?.current_billing_period ? (
                              <>Current Subscription: <strong>{subscriptionStatus.current_plan === 'plus' ? 'AutoIQ+' : 'Pro+'}</strong> {subscriptionStatus.current_billing_period === 'monthly' ? 'Monthly' : 'Yearly'}</>
                            ) : (
                              <>Change your subscription billing period or upgrade to a different plan.</>
                            )}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {/* Switch to Monthly (only show if currently yearly) */}
                        {subscriptionStatus?.current_billing_period !== 'monthly' && (
                          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-bold text-gray-900">Monthly Billing</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {subscriptionStatus?.current_plan === 'plus' ? '$7.99/month' : '$19.99/month'}
                                </div>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSwitchBillingPeriod('monthly')}
                              disabled={loadingBilling}
                              className="w-full btn-premium py-2.5 text-sm font-bold disabled:opacity-50"
                            >
                              {loadingBilling ? 'Processing...' : 'Switch to Monthly'}
                            </button>
                          </div>
                        )}

                        {/* Switch to Yearly (only show if currently monthly) */}
                        {subscriptionStatus?.current_billing_period !== 'yearly' && (
                          <div className="bg-white rounded-lg p-4 border-2 border-green-200 relative overflow-hidden">
                            <div className="absolute top-2 right-2">
                              <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">Save</span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-bold text-gray-900">Yearly Billing</div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {subscriptionStatus?.current_plan === 'plus' ? '$79/year' : '$199/year'}
                                </div>
                                <div className="text-xs text-green-600 font-semibold mt-1">
                                  {subscriptionStatus?.current_plan === 'plus' ? 'Save $16.88/year' : 'Save $40.88/year'}
                                </div>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSwitchBillingPeriod('yearly')}
                              disabled={loadingBilling}
                              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                            >
                              {loadingBilling ? 'Processing...' : 'Switch to Yearly'}
                            </button>
                          </div>
                        )}

                        {/* Upgrade to Pro+ Monthly (only show if currently on Plus) */}
                        {subscriptionStatus?.current_plan === 'plus' && subscriptionStatus?.current_billing_period !== 'monthly' && (
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-200 relative overflow-hidden">
                            <div className="absolute top-2 right-2">
                              <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">Upgrade</span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-bold text-gray-900">Pro+ Monthly</div>
                                <div className="text-sm text-gray-600 mt-1">$19.99/month</div>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpgradeSubscription('pro_plus', 'monthly')}
                              disabled={loadingBilling}
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                            >
                              {loadingBilling ? 'Processing...' : 'Upgrade to Pro+ Monthly'}
                            </button>
                          </div>
                        )}

                        {/* Upgrade to Pro+ Yearly (only show if currently on Plus) */}
                        {subscriptionStatus?.current_plan === 'plus' && subscriptionStatus?.current_billing_period !== 'yearly' && (
                          <div className="bg-white rounded-lg p-4 border-2 border-purple-200 relative overflow-hidden">
                            <div className="absolute top-2 right-2">
                              <span className="bg-purple-500 text-white text-xs font-bold px-2 py-1 rounded-full">Upgrade</span>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <div className="font-bold text-gray-900">Pro+ Yearly</div>
                                <div className="text-sm text-gray-600 mt-1">$199/year</div>
                                <div className="text-xs text-green-600 font-semibold mt-1">Save $40.88/year</div>
                              </div>
                              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpgradeSubscription('pro_plus', 'yearly')}
                              disabled={loadingBilling}
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                            >
                              {loadingBilling ? 'Processing...' : 'Upgrade to Pro+ Yearly'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Switching billing periods or upgrading plans updates your existing subscription immediately. You'll be charged a prorated amount for the difference, and your billing cycle will be adjusted accordingly.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 text-xl">✓</span>
                  <div>
                    <div className="font-semibold text-green-900 mb-1">Billing Enabled</div>
                    <p className="text-sm text-green-800">
                      Real payment processing is active. Subscribe to unlock premium features.
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing Period Toggle */}
              <div className="mt-6 mb-4">
                <div className="flex items-center justify-center gap-4 bg-gray-50 rounded-lg p-2 border border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Billing Period:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        billingPeriod === 'monthly'
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod('yearly')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        billingPeriod === 'yearly'
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Yearly
                      <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Save</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Only show upgrade buttons if user doesn't have an active subscription */}
                {!subscriptionStatus?.has_subscription && plan !== 'plus' && plan !== 'pro_plus' && (
                  <div className="border-2 border-primary-200 rounded-xl p-6 bg-gradient-to-br from-primary-50 to-white">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Upgrade to AutoIQ+</h4>
                    <div className="mb-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {billingPeriod === 'monthly' ? (
                          <>$7.99<span className="text-sm font-normal text-gray-600">/month</span></>
                        ) : (
                          <>$79<span className="text-sm font-normal text-gray-600">/year</span></>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {billingPeriod === 'monthly' ? '$79/year' : '$7.99/month equivalent'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 italic">Best for: Daily drivers & car lovers</div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Unlock AI-powered diagnostics, repair recommendations, and cost estimates.
                    </p>
                    <button
                      onClick={() => handleUpgrade('plus')}
                      disabled={loadingBilling}
                      className="w-full btn-premium px-6 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {loadingBilling ? 'Loading...' : `Subscribe to AutoIQ+ (${billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'})`}
                    </button>
                  </div>
                )}

                {/* Only show upgrade buttons if user doesn't have an active subscription */}
                {!subscriptionStatus?.has_subscription && plan !== 'pro_plus' && (
                  <div className="border-2 border-accent-200 rounded-xl p-6 bg-gradient-to-br from-accent-50 to-white">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">Upgrade to Pro+</h4>
                    <div className="mb-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {billingPeriod === 'monthly' ? (
                          <>$19.99<span className="text-sm font-normal text-gray-600">/month</span></>
                        ) : (
                          <>$199<span className="text-sm font-normal text-gray-600">/year</span></>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {billingPeriod === 'monthly' ? '$199/year' : '$19.99/month equivalent'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 italic">Best for: Mechanics & shop owners</div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Everything in AutoIQ+, plus advanced features, data export, and priority support.
                    </p>
                    <button
                      onClick={() => handleUpgrade('pro_plus')}
                      disabled={loadingBilling}
                      className="w-full btn-premium px-6 py-3 text-sm font-bold disabled:opacity-50"
                    >
                      {loadingBilling ? 'Loading...' : `Subscribe to Pro+ (${billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'})`}
                    </button>
                  </div>
                )}

                {(plan === 'plus' || plan === 'pro_plus') && (
                  <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-blue-600 text-xl">ℹ️</span>
                      <div>
                        <div className="font-semibold text-blue-900 mb-1">Active Subscription</div>
                        <p className="text-sm text-blue-800">
                          You are currently on the <strong>{plan === 'plus' ? 'AutoIQ+' : 'Pro+'}</strong> plan.
                          Subscription management and webhook-based entitlements will be available in a future update.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-600 space-y-2">
              <p>Billing is not yet configured.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl">📋</span>
                  <div>
                    <div className="font-semibold text-blue-900 mb-1">Coming Soon</div>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Account management</li>
                      <li>Payment methods</li>
                      <li>Subscription history</li>
                      <li>Invoice downloads</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Log */}
        <ActivityLog />

        {/* Data Export */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Data Export</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Export your diagnostic data, vehicle information, and activity logs.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const [status, codes, vehicle, liveData] = await Promise.all([
                      apiClient.getStatus(),
                      apiClient.getCodes().catch(() => null),
                      apiClient.getVehicleInfo().catch(() => null),
                      apiClient.getLiveData().catch(() => null),
                    ]);

                    const exportData = {
                      timestamp: new Date().toISOString(),
                      status,
                      codes,
                      vehicle,
                      liveData,
                    };

                    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `autoiq-export-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('Data exported successfully', 'success');
                    logActivity('export', 'Diagnostic data exported');
                  } catch (error) {
                    console.error('Failed to export data:', error);
                    showToast('Failed to export data', 'error');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                Export All Data
              </button>
              <button
                onClick={() => {
                  try {
                    const activities = localStorage.getItem('autoiq_activity_log');
                    if (!activities) {
                      showToast('No activity log to export', 'info');
                      return;
                    }
                    const blob = new Blob([activities], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `autoiq-activity-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('Activity log exported successfully', 'success');
                  } catch (error) {
                    console.error('Failed to export activity log:', error);
                    showToast('Failed to export activity log', 'error');
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Export Activity Log
              </button>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">About AutoIQ</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
            <div>
              <div className="text-gray-500 mb-1">Version</div>
              <div className="font-semibold text-gray-900">0.1.0</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Platform</div>
              <div className="font-semibold text-gray-900">Desktop</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">Status</div>
              <div className="font-semibold text-green-600">Active</div>
            </div>
            <div>
              <div className="text-gray-500 mb-1">License</div>
              <div className="font-semibold text-gray-900">MIT</div>
            </div>
          </div>
          
          {/* BuildWithDani Badge */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <BuildWithDaniBadge variant="default" showLogo={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
