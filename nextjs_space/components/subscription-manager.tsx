'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Crown, 
  Gift,
  Clock,
  Check,
  X,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UserSubscription {
  id: string;
  name: string | null;
  email: string;
  role: string;
  subscriptionType: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string;
  dailyRate: number;
  createdAt: string;
}

export default function SubscriptionManager() {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (userId: string, subscriptionType: string, dailyRate: number) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscriptionType, dailyRate }),
      });

      if (res.ok) {
        const updated = await res.json();
        setUsers(users.map(u => u.id === userId ? { ...u, ...updated } : u));
        toast.success('Subscription aktualisiert');
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'trialing': return 'bg-blue-100 text-blue-700';
      case 'expired': return 'bg-red-100 text-red-700';
      case 'canceled': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktiv';
      case 'trialing': return 'Trial';
      case 'expired': return 'Abgelaufen';
      case 'canceled': return 'Gekündigt';
      default: return status;
    }
  };

  const getRemainingTrialDays = (endDate: string | null) => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
        <div className="flex items-center gap-3 text-white">
          <CreditCard className="w-6 h-6" />
          <h2 className="text-lg font-bold">Subscription-Verwaltung</h2>
        </div>
        <p className="text-blue-100 text-sm mt-1">
          Verwalten Sie hier die Abrechnungstypen Ihrer Benutzer
        </p>
      </div>

      <div className="p-6 space-y-4">
        {/* Legend */}
        <div className="flex flex-wrap gap-3 pb-4 border-b border-gray-200">
          <span className="flex items-center gap-1.5 text-sm">
            <Gift className="w-4 h-4 text-green-500" />
            <span className="text-gray-600">Free = Gratis</span>
          </span>
          <span className="flex items-center gap-1.5 text-sm">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-gray-600">Pay = Kostenpflichtig (0.5 CHF/Tag)</span>
          </span>
        </div>

        {/* User List */}
        {users.map((user) => (
          <motion.div
            key={user.id}
            layout
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* User Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name || 'Kein Name'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Current Type Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.subscriptionType === 'free' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {user.subscriptionType === 'free' ? (
                    <span className="flex items-center gap-1">
                      <Gift className="w-3 h-3" /> Free
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Pay
                    </span>
                  )}
                </span>

                {/* Status Badge */}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.subscriptionStatus)}`}>
                  {getStatusText(user.subscriptionStatus)}
                </span>

                {expandedUser === user.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedUser === user.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 bg-gray-50"
                >
                  <div className="p-4 space-y-4">
                    {/* Trial Info */}
                    {user.subscriptionType === 'pay' && user.trialEndDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600">
                          Trial endet: {new Date(user.trialEndDate).toLocaleDateString('de-CH')}
                          {getRemainingTrialDays(user.trialEndDate) > 0 && (
                            <span className="text-blue-600 ml-2">
                              ({getRemainingTrialDays(user.trialEndDate)} Tage übrig)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Stripe Info */}
                    {user.stripeSubscriptionId && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-gray-600">Stripe Abo aktiv</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSubscription(user.id, 'free', 0.5);
                        }}
                        disabled={updating === user.id || user.subscriptionType === 'free'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          user.subscriptionType === 'free'
                            ? 'bg-green-500 text-white cursor-not-allowed'
                            : 'bg-white border border-green-500 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {updating === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Gift className="w-4 h-4" />
                        )}
                        Free (Gratis)
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSubscription(user.id, 'pay', 0.5);
                        }}
                        disabled={updating === user.id || user.subscriptionType === 'pay'}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          user.subscriptionType === 'pay'
                            ? 'bg-yellow-500 text-white cursor-not-allowed'
                            : 'bg-white border border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                        }`}
                      >
                        {updating === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Crown className="w-4 h-4" />
                        )}
                        Pay (0.5 CHF/Tag)
                      </button>
                    </div>

                    {/* Daily Rate Info */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
                      <DollarSign className="w-4 h-4" />
                      Aktueller Tagesatz: CHF {user.dailyRate.toFixed(2)} = CHF {(user.dailyRate * 30).toFixed(2)}/Monat
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Keine Benutzer gefunden
          </div>
        )}
      </div>
    </div>
  );
}
