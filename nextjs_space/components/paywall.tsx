'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Crown, 
  Clock, 
  AlertTriangle,
  Loader2,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface SubscriptionStatus {
  subscriptionType: string;
  status: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  remainingTrialDays: number;
  hasActiveSubscription: boolean;
  requiresPayment: boolean;
  dailyRate: number;
  monthlyRate: number;
}

interface PaywallProps {
  children: React.ReactNode;
}

export default function Paywall({ children }: PaywallProps) {
  const { data: session, status: authStatus } = useSession();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showTrialWarning, setShowTrialWarning] = useState(false);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchSubscriptionStatus();
    } else if (authStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [authStatus]);

  const fetchSubscriptionStatus = async () => {
    try {
      const res = await fetch('/api/subscription/status');
      if (res.ok) {
        const data = await res.json();
        setSubscriptionStatus(data);
        
        // Show warning if less than 3 days remaining
        if (data.subscriptionType === 'pay' && data.remainingTrialDays > 0 && data.remainingTrialDays <= 3) {
          setShowTrialWarning(true);
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        console.error('Checkout failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Loading state
  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Not authenticated - show children (login page etc.)
  if (!session) {
    return <>{children}</>;
  }

  // Free user or active subscription - show content
  if (
    !subscriptionStatus ||
    subscriptionStatus.subscriptionType === 'free' ||
    subscriptionStatus.hasActiveSubscription ||
    !subscriptionStatus.requiresPayment
  ) {
    return (
      <>
        {/* Trial Warning Banner */}
        {showTrialWarning && subscriptionStatus && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 z-50 shadow-lg"
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">
                  Ihre Trial-Version läuft in {subscriptionStatus.remainingTrialDays} Tag{subscriptionStatus.remainingTrialDays !== 1 ? 'en' : ''} ab!
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCheckout}
                  className="bg-white text-orange-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-50 transition-colors"
                >
                  Jetzt upgraden
                </button>
                <button
                  onClick={() => setShowTrialWarning(false)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className={showTrialWarning ? 'pt-14' : ''}>
          {children}
        </div>
      </>
    );
  }

  // Payment required - show paywall
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-4"
          >
            <Crown className="w-10 h-10 text-yellow-300" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">Trial-Version abgelaufen</h1>
          <p className="text-blue-100 mt-2">Upgraden Sie jetzt auf Planbar Pro</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Pricing */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold text-gray-900">
                CHF {subscriptionStatus?.dailyRate?.toFixed(2) || '0.15'}
              </span>
              <span className="text-gray-500">/Monat</span>
            </div>
            <p className="text-gray-500 mt-1">
              pro User
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span>Unbegrenzter Zugriff auf alle Funktionen</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span>Projektmanagement & Ressourcenplanung</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span>Team-Zusammenarbeit & E-Mail-Benachrichtigungen</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span>Kalender-Integration & Abwesenheiten</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleCheckout}
            disabled={checkoutLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird geladen...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Jetzt upgraden mit Stripe
              </>
            )}
          </button>

          {/* Secure Payment */}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Sichere Zahlung über Stripe</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
