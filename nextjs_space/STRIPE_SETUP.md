# Stripe-Integration für Planbar

## Übersicht

Planbar bietet jetzt ein Subscription-System mit Stripe-Integration:

- **Free-User**: Gratis, keine Einschränkungen
- **Pay-User**: 14-Tage Trial, dann CHF 0.50/Tag (~CHF 15/Monat)

## Funktionen

### Admin-Funktionen (Settings-Seite)

1. **Subscription-Verwaltung**: Benutzer auf "Free" oder "Pay" umstellen
2. **Trial-Übersicht**: Sehen, wie viele Tage Trial übrig sind
3. **Abo-Status**: Aktiv, Trial, Abgelaufen, Gekündigt

### User-Funktionen

1. **Trial-Warnung**: Banner wenn Trial < 3 Tage
2. **Paywall**: Automatische Weiterleitung zu Stripe wenn Trial abgelaufen
3. **Erfolgs-Bestätigung**: Nach erfolgreicher Zahlung

## Stripe-Konfiguration

### 1. Stripe-Account erstellen

1. Gehe zu https://dashboard.stripe.com/
2. Registriere dich / Melde dich an
3. Aktiviere den Account für Produktion (optional, Test-Modus funktioniert auch)

### 2. API-Keys holen

1. Navigiere zu: Dashboard → Developers → API keys
2. Kopiere:
   - **Secret key**: `sk_test_...` (für Test) oder `sk_live_...` (für Produktion)
   - **Publishable key**: `pk_test_...` oder `pk_live_...`

### 3. Webhook einrichten

1. Navigiere zu: Dashboard → Developers → Webhooks
2. Klicke "Add endpoint"
3. URL: `https://planbar-one.vercel.app/api/stripe/webhook`
4. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Kopiere das **Webhook signing secret**: `whsec_...`

### 4. Environment Variables setzen

In Vercel (oder .env.local):

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...  # oder sk_live_... für Produktion
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # oder pk_live_...

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Vercel Dashboard:

1. Gehe zu: https://vercel.com/your-project/settings/environment-variables
2. Füge die drei Variablen hinzu
3. Redeploy auslösen

## Preisgestaltung

| Typ | Preis | Beschreibung |
|-----|-------|-------------|
| Free | CHF 0 | Voller Zugriff, keine Einschränkungen |
| Pay | CHF 0.50/Tag | Nach 14-Tage Trial, monatliche Abrechnung (CHF 15/Monat) |

## Workflow

### Admin setzt User auf "Pay":

1. Admin geht zu Settings → Subscription-Verwaltung
2. Klickt auf User → "Pay" Button
3. 14-Tage Trial startet automatisch

### User nach Trial-Ablauf:

1. User sieht Paywall beim nächsten Login
2. Klickt "Jetzt upgraden mit Stripe"
3. Wird zu Stripe Checkout weitergeleitet
4. Nach Zahlung: Zurück zu Planbar mit aktivem Abo

## API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|-------------|
| `/api/admin/subscriptions` | GET | Alle User mit Subscription-Info (Admin) |
| `/api/admin/subscriptions` | PUT | User Subscription aktualisieren (Admin) |
| `/api/subscription/status` | GET | Eigenen Subscription-Status abrufen |
| `/api/stripe/checkout` | POST | Stripe Checkout Session erstellen |
| `/api/stripe/webhook` | POST | Stripe Webhook-Events verarbeiten |

## Datenbank-Felder (User-Model)

```prisma
model User {
  // Subscription / Bezahlung
  subscriptionType     String    @default("free")    // "free" oder "pay"
  trialStartDate       DateTime?                      // Beginn der 14-Tage Trial
  trialEndDate         DateTime?                      // Ende der Trial
  stripeCustomerId     String?                        // Stripe Customer ID
  stripeSubscriptionId String?                        // Stripe Subscription ID
  subscriptionStatus   String    @default("active")  // "active", "trialing", "expired", "canceled"
  dailyRate            Float     @default(0.5)       // CHF pro Tag
}
```

## Troubleshooting

### Stripe nicht konfiguriert

Wenn die Stripe-Keys fehlen, zeigt die App eine Fehlermeldung an. Die App funktioniert weiterhin für Free-User.

### Webhook-Fehler

1. Prüfe ob die URL korrekt ist
2. Prüfe ob das Webhook-Secret korrekt ist
3. Prüfe die Vercel-Logs für Details

### Trial läuft nicht ab

Die Trial-Prüfung erfolgt beim Laden des Subscription-Status. Der Status wird automatisch auf "expired" gesetzt wenn:
- subscriptionType = "pay"
- trialEndDate < jetzt
- kein aktives Stripe-Abo vorhanden

## Sicherheit

- Secret Keys werden nur serverseitig verwendet
- Webhook-Signatur wird verifiziert
- Keine Kartendaten werden gespeichert (alles über Stripe)
- HTTPS-only für alle API-Aufrufe
