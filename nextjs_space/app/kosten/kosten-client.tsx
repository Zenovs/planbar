'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/header';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Server,
  Globe,
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Check,
  AlertTriangle,
  Crown,
  Gift,
  ChevronDown,
  ChevronUp,
  Loader2,
  Settings,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  title: string;
  amount: number;
  type: string;
  recurring: boolean;
  interval: string | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

interface Revenue {
  totalUsers: number;
  freeUsers: number;
  payingUsers: number;
  trialUsers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  potentialMonthly: number;
  averageDailyRate: number;
}

interface UserSubscription {
  id: string;
  name: string | null;
  email: string;
  subscriptionType: string;
  subscriptionStatus: string;
  dailyRate: number;
  trialEndDate: string | null;
  stripeSubscriptionId: string | null;
}

const EXPENSE_TYPES = [
  { value: 'domain', label: 'Domain', icon: Globe, color: 'bg-blue-500' },
  { value: 'server', label: 'Server/Hosting', icon: Server, color: 'bg-purple-500' },
  { value: 'software', label: 'Software/Lizenzen', icon: Package, color: 'bg-green-500' },
  { value: 'other', label: 'Sonstiges', icon: Wallet, color: 'bg-gray-500' },
];

export default function KostenClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [updating, setUpdating] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'domain',
    recurring: false,
    interval: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [expensesRes, revenueRes, usersRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/admin/revenue'),
        fetch('/api/admin/subscriptions'),
      ]);

      if (expensesRes.ok) setExpenses(await expensesRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error('Error:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyExpenses = () => {
    return expenses.reduce((sum, exp) => {
      if (!exp.recurring) return sum;
      if (exp.interval === 'monthly') return sum + exp.amount;
      if (exp.interval === 'yearly') return sum + exp.amount / 12;
      return sum;
    }, 0);
  };

  const calculateYearlyExpenses = () => {
    return expenses.reduce((sum, exp) => {
      if (!exp.recurring) return sum + exp.amount;
      if (exp.interval === 'monthly') return sum + exp.amount * 12;
      if (exp.interval === 'yearly') return sum + exp.amount;
      return sum;
    }, 0);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const method = editingExpense ? 'PUT' : 'POST';
      const body = editingExpense 
        ? { ...formData, id: editingExpense.id, amount: parseFloat(formData.amount) }
        : { ...formData, amount: parseFloat(formData.amount) };

      const res = await fetch('/api/expenses', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editingExpense ? 'Ausgabe aktualisiert' : 'Ausgabe hinzugefügt');
        setShowExpenseForm(false);
        setEditingExpense(null);
        resetForm();
        fetchData();
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Ausgabe wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Ausgabe gelöscht');
        fetchData();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const updateUserSubscription = async (userId: string, subscriptionType: string) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscriptionType, dailyRate: 0.5 }),
      });

      if (res.ok) {
        toast.success('Subscription aktualisiert');
        fetchData();
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setUpdating(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      type: 'domain',
      recurring: false,
      interval: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: '',
    });
  };

  const openEditForm = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      type: expense.type,
      recurring: expense.recurring,
      interval: expense.interval || 'monthly',
      startDate: expense.startDate.split('T')[0],
      endDate: expense.endDate ? expense.endDate.split('T')[0] : '',
      notes: expense.notes || '',
    });
    setShowExpenseForm(true);
  };

  const getExpenseIcon = (type: string) => {
    const found = EXPENSE_TYPES.find(t => t.value === type);
    return found ? found.icon : Wallet;
  };

  const getExpenseColor = (type: string) => {
    const found = EXPENSE_TYPES.find(t => t.value === type);
    return found ? found.color : 'bg-gray-500';
  };

  const monthlyProfit = (revenue?.monthlyRevenue || 0) - calculateMonthlyExpenses();
  const yearlyProfit = (revenue?.yearlyRevenue || 0) - calculateYearlyExpenses();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl text-white">
              <Wallet className="w-6 h-6" />
            </div>
            Kosten-Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Einnahmen, Ausgaben und Subscription-Verwaltung</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Monatliche Einnahmen */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Einnahmen/Monat</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              CHF {revenue?.monthlyRevenue.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {revenue?.payingUsers || 0} zahlende User
            </p>
          </motion.div>

          {/* Monatliche Ausgaben */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Ausgaben/Monat</span>
              <TrendingDown className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              CHF {calculateMonthlyExpenses().toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {expenses.filter(e => e.recurring).length} laufende Kosten
            </p>
          </motion.div>

          {/* Gewinn/Verlust */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`bg-white rounded-xl p-5 shadow-sm border ${monthlyProfit >= 0 ? 'border-green-200' : 'border-red-200'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Gewinn/Monat</span>
              {monthlyProfit >= 0 ? (
                <Check className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className={`text-2xl font-bold ${monthlyProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              CHF {monthlyProfit.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Jährlich: CHF {yearlyProfit.toFixed(2)}
            </p>
          </motion.div>

          {/* User-Übersicht */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-500">Benutzer</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {revenue?.totalUsers || 0}
            </p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                {revenue?.freeUsers || 0} Free
              </span>
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                {revenue?.payingUsers || 0} Pay
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                {revenue?.trialUsers || 0} Trial
              </span>
            </div>
          </motion.div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Stripe Konfiguration */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'stripe' ? null : 'stripe')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg text-white">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Stripe-Konfiguration</h3>
                  <p className="text-sm text-gray-500">Zahlungen und API-Schlüssel verwalten</p>
                </div>
              </div>
              {expandedSection === 'stripe' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'stripe' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-5 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Stripe einrichten
                      </h4>
                      <p className="text-sm text-blue-600 mt-2">
                        Um Zahlungen zu aktivieren, müssen Sie die folgenden Umgebungsvariablen in Vercel setzen:
                      </p>
                      <div className="mt-3 bg-white rounded-lg p-3 font-mono text-xs space-y-1">
                        <p><span className="text-purple-600">STRIPE_SECRET_KEY</span>=sk_live_...</p>
                        <p><span className="text-purple-600">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</span>=pk_live_...</p>
                        <p><span className="text-purple-600">STRIPE_WEBHOOK_SECRET</span>=whsec_...</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <a
                        href="https://dashboard.stripe.com/apikeys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <LinkIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">API-Schlüssel</p>
                          <p className="text-sm text-gray-500">Stripe Dashboard öffnen</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>

                      <a
                        href="https://dashboard.stripe.com/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Settings className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Webhooks</p>
                          <p className="text-sm text-gray-500">Webhook einrichten</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Webhook-URL</h4>
                      <code className="text-sm bg-white px-3 py-2 rounded border block overflow-x-auto">
                        https://planbar-one.vercel.app/api/stripe/webhook
                      </code>
                      <p className="text-xs text-gray-500 mt-2">
                        Events: checkout.session.completed, customer.subscription.*, invoice.*
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Ausgaben */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'expenses' ? null : 'expenses')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-lg text-white">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Ausgaben verwalten</h3>
                  <p className="text-sm text-gray-500">Domain, Server, Software und mehr</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-red-600">
                  CHF {calculateMonthlyExpenses().toFixed(2)}/Mt
                </span>
                {expandedSection === 'expenses' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </button>
            
            <AnimatePresence>
              {expandedSection === 'expenses' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-5">
                    {/* Add Button */}
                    <button
                      onClick={() => {
                        resetForm();
                        setEditingExpense(null);
                        setShowExpenseForm(true);
                      }}
                      className="mb-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      <Plus className="w-4 h-4" />
                      Ausgabe hinzufügen
                    </button>

                    {/* Expense Form */}
                    <AnimatePresence>
                      {showExpenseForm && (
                        <motion.form
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          onSubmit={handleSubmitExpense}
                          className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Bezeichnung</label>
                              <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Betrag (CHF)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Kategorie</label>
                              <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              >
                                {EXPENSE_TYPES.map((t) => (
                                  <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Wiederkehrend</label>
                              <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={formData.recurring}
                                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                                    className="rounded"
                                  />
                                  <span className="text-sm">Ja</span>
                                </label>
                                {formData.recurring && (
                                  <select
                                    value={formData.interval}
                                    onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                                    className="px-3 py-1 border rounded-lg text-sm"
                                  >
                                    <option value="monthly">Monatlich</option>
                                    <option value="yearly">Jährlich</option>
                                  </select>
                                )}
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Startdatum</label>
                              <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Notizen</label>
                              <input
                                type="text"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Optional"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              type="submit"
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
                              <Save className="w-4 h-4" />
                              Speichern
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExpenseForm(false);
                                setEditingExpense(null);
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                              <X className="w-4 h-4" />
                              Abbrechen
                            </button>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>

                    {/* Expense List */}
                    <div className="space-y-3">
                      {expenses.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Keine Ausgaben erfasst</p>
                      ) : (
                        expenses.map((expense) => {
                          const Icon = getExpenseIcon(expense.type);
                          return (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg text-white ${getExpenseColor(expense.type)}`}>
                                  <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{expense.title}</p>
                                  <div className="flex items-center gap-2 text-sm text-gray-500">
                                    {expense.recurring && (
                                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                        {expense.interval === 'monthly' ? 'Monatlich' : 'Jährlich'}
                                      </span>
                                    )}
                                    {expense.notes && <span>{expense.notes}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-gray-900">
                                  CHF {expense.amount.toFixed(2)}
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => openEditForm(expense)}
                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Subscriptions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'users' ? null : 'users')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Benutzer-Subscriptions</h3>
                  <p className="text-sm text-gray-500">Free/Pay Status für jeden User festlegen</p>
                </div>
              </div>
              {expandedSection === 'users' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {expandedSection === 'users' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200"
                >
                  <div className="p-5 space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
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
                          {/* Status Badge */}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.subscriptionStatus === 'active' ? 'bg-green-100 text-green-700' :
                            user.subscriptionStatus === 'trialing' ? 'bg-blue-100 text-blue-700' :
                            user.subscriptionStatus === 'expired' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {user.subscriptionStatus === 'active' ? 'Aktiv' :
                             user.subscriptionStatus === 'trialing' ? 'Trial' :
                             user.subscriptionStatus === 'expired' ? 'Abgelaufen' : 'Gekündigt'}
                          </span>

                          {/* Toggle Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateUserSubscription(user.id, 'free')}
                              disabled={updating === user.id || user.subscriptionType === 'free'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                user.subscriptionType === 'free'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white border border-green-500 text-green-600 hover:bg-green-50'
                              } disabled:opacity-50`}
                            >
                              {updating === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Gift className="w-3 h-3" />
                              )}
                              Free
                            </button>
                            <button
                              onClick={() => updateUserSubscription(user.id, 'pay')}
                              disabled={updating === user.id || user.subscriptionType === 'pay'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                user.subscriptionType === 'pay'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-white border border-yellow-500 text-yellow-600 hover:bg-yellow-50'
                              } disabled:opacity-50`}
                            >
                              {updating === user.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Crown className="w-3 h-3" />
                              )}
                              Pay
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
