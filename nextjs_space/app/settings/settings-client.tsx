'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X, CheckCircle, Building2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SettingsClientProps {
  isAdmin?: boolean;
}

export default function SettingsClient({ isAdmin = true }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentStatus = searchParams.get('payment');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    // Show payment success message
    if (paymentStatus === 'success') {
      setShowPaymentSuccess(true);
      toast.success('Zahlung erfolgreich! Ihr Abonnement ist jetzt aktiv.');
    }
  }, [paymentStatus]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Einstellungen</h1>
        <p className="text-muted-foreground mb-8">Allgemeine Einstellungen</p>

        {/* Payment Success Banner */}
        {showPaymentSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Zahlung erfolgreich!</p>
              <p className="text-sm text-green-600">Ihr Planbar Pro Abonnement ist jetzt aktiv.</p>
            </div>
            <button
              onClick={() => setShowPaymentSuccess(false)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        <div className="space-y-6">
          {/* Hinweis zur Benutzerverwaltung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Benutzerverwaltung
              </CardTitle>
              <CardDescription>
                Die Benutzerverwaltung wurde in den Bereich "Organisation" verschoben.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Hier können Sie alle Benutzer Ihrer Organisation verwalten:
              </p>
              <ul className="text-sm text-gray-600 mb-6 list-disc list-inside space-y-1">
                <li>Rollen zuweisen (Admin, Projektleiter, Koordinator, Mitglied)</li>
                <li>Teams zuweisen</li>
                <li>Wochenstunden und Pensum bearbeiten</li>
                <li>Benutzer entfernen</li>
              </ul>
              <Button
                onClick={() => router.push('/unternehmen')}
                className="flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Zur Organisation
                <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
