import Stripe from 'stripe';

// Server-side Stripe instance (only initialize if key is available)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeSecretKey 
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2025-04-30.basil' as any,
      typescript: true,
    })
  : null;

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripeSecretKey && !!stripe;
}

// Product & Price configuration for Planbar
export const PLANBAR_CONFIG = {
  productName: 'Planbar Pro',
  dailyRate: 0.5, // CHF pro Tag (Standard)
  trialDays: 14, // 14-Tage Trial
  currency: 'chf',
};

// Calculate monthly price based on daily rate
export function calculateMonthlyPrice(dailyRate: number): number {
  // ~30 Tage pro Monat
  return Math.round(dailyRate * 30 * 100); // in Rappen/Cents
}

// Check if trial has expired
export function isTrialExpired(trialEndDate: Date | null): boolean {
  if (!trialEndDate) return false;
  return new Date() > new Date(trialEndDate);
}

// Calculate remaining trial days
export function getRemainingTrialDays(trialEndDate: Date | null): number {
  if (!trialEndDate) return 0;
  const now = new Date();
  const end = new Date(trialEndDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Get subscription status display text
export function getSubscriptionStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Aktiv',
    trialing: 'Trial',
    expired: 'Abgelaufen',
    canceled: 'Gekündigt',
  };
  return statusMap[status] || status;
}

// Get subscription type display text
export function getSubscriptionTypeText(type: string): string {
  return type === 'free' ? 'Gratis' : 'Bezahlt';
}
