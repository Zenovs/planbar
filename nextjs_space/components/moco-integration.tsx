'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  Link2, 
  Check, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Info,
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MocoIntegrationProps {
  onClose?: () => void;
}

interface IntegrationStatus {
  hasIntegration: boolean;
  integration: {
    instanceDomain: string;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    lastSyncError: string | null;
    isActive: boolean;
    createdAt: string;
  } | null;
}

export function MocoIntegration({ onClose }: MocoIntegrationProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [apiKey, setApiKey] = useState('');
  const [instanceDomain, setInstanceDomain] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/moco/integration');
      const data = await res.json();
      setStatus(data);
      if (data.integration) {
        setInstanceDomain(data.integration.instanceDomain);
      }
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      toast.error('Fehler beim Laden der Integration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !instanceDomain.trim()) {
      toast.error('Bitte füllen Sie alle Felder aus');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/moco/integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          instanceDomain: instanceDomain.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }

      toast.success(data.message || 'Integration erfolgreich gespeichert');
      setApiKey('');
      setShowForm(false);
      loadStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/moco/sync', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Sync fehlgeschlagen');
      }

      toast.success(data.message || 'Sync erfolgreich');
      loadStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sync fehlgeschlagen');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie die MOCO-Integration wirklich entfernen? Alle synchronisierten Daten werden gelöscht.')) {
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch('/api/moco/integration', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Löschen');
      }

      toast.success('Integration entfernt');
      setApiKey('');
      setInstanceDomain('');
      loadStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">MOCO Integration</h3>
            <p className="text-purple-100 text-sm">Kalenderabgleich mit MOCO</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info-Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Automatischer Kalenderabgleich</p>
              <ul className="space-y-1 text-blue-600 dark:text-blue-400">
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Täglicher Abgleich um 04:00 Uhr
                </li>
                <li className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Einträge erscheinen am Folgetag
                </li>
              </ul>
              <p className="mt-2 text-xs opacity-75">
                Ihr API-Key wird verschlüsselt gespeichert und ist für andere nicht einsehbar.
              </p>
            </div>
          </div>
        </div>

        {/* Aktueller Status */}
        {status?.hasIntegration && status.integration && (
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                status.integration.lastSyncStatus === 'success' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : status.integration.lastSyncStatus === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
              }`}>
                {status.integration.lastSyncStatus === 'success' && <Check className="w-3.5 h-3.5" />}
                {status.integration.lastSyncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
                {status.integration.lastSyncStatus === 'success' ? 'Verbunden' : 
                 status.integration.lastSyncStatus === 'error' ? 'Fehler' : 'Ausstehend'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Instance</span>
              <span className="text-sm font-mono text-gray-900 dark:text-white">
                {status.integration.instanceDomain}.mocoapp.com
              </span>
            </div>

            {status.integration.lastSyncAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Letzter Sync</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {format(new Date(status.integration.lastSyncAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                </span>
              </div>
            )}

            {status.integration.lastSyncError && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-3 mt-2">
                <p className="text-xs text-red-600 dark:text-red-400">
                  {status.integration.lastSyncError}
                </p>
              </div>
            )}

            {/* Aktionen */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {syncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Jetzt synchronisieren
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Formular */}
        <AnimatePresence>
          {(!status?.hasIntegration || showForm) && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSave}
              className="space-y-4"
            >
              {showForm && status?.hasIntegration && (
                <div className="flex items-center justify-between pb-2 border-b dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    API-Key aktualisieren
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    &times;
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  MOCO Instance Domain
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={instanceDomain}
                    onChange={(e) => setInstanceDomain(e.target.value)}
                    placeholder="meinefirma"
                    className="w-full px-4 py-2.5 pr-32 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    .mocoapp.com
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Der Teil vor .mocoapp.com in Ihrer MOCO-URL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Persönlicher API-Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ihr MOCO API-Key"
                    className="w-full px-4 py-2.5 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Finden Sie unter MOCO &rarr; Profil &rarr; Integrationen &rarr; API-Schlüssel
                </p>
              </div>

              <button
                type="submit"
                disabled={saving || !apiKey.trim() || !instanceDomain.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verbindung wird getestet...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Verbindung speichern
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
