'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw, User, AlertCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface UserHours {
  userId: number;
  userName: string;
  hours: number;
}

interface MocoActualHoursProps {
  ticketId: string;
  mocoProjectId: string;
  estimatedHours?: number | null;
}

export function MocoActualHours({ ticketId, mocoProjectId, estimatedHours }: MocoActualHoursProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalHours, setTotalHours] = useState(0);
  const [byUser, setByUser] = useState<UserHours[]>([]);
  const [activityCount, setActivityCount] = useState(0);

  const loadActualHours = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch(`/api/moco/activities?ticketId=${ticketId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Laden');
      }

      setTotalHours(data.totalHours || 0);
      setByUser(data.byUser || []);
      setActivityCount(data.activityCount || 0);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      console.error('Ist-Stunden Ladefehler:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (mocoProjectId) {
      loadActualHours();
    }
  }, [ticketId, mocoProjectId]);

  const handleRefresh = async () => {
    await loadActualHours(true);
    toast.success('Ist-Stunden aktualisiert');
  };

  // Berechne Prozent
  const budget = estimatedHours || 0;
  const percentage = budget > 0 ? Math.round((totalHours / budget) * 100) : 0;
  const isOverBudget = totalHours > budget && budget > 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Ist Stunden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Ist Stunden
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing}
              title="Aktualisieren"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Info Box */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <ExternalLink className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-700 dark:text-green-400">
              Die Ist-Stunden werden aus MOCO synchronisiert (Projekt-ID: {mocoProjectId}).
              Stundenänderungen erfolgen direkt in MOCO.
            </p>
          </div>
        </div>

        {error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-orange-400 mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{error}</p>
            <Button onClick={() => loadActualHours()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Haupt-Anzeige: Geplant vs Ist */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fortschritt</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalHours.toFixed(1)}h
                    {budget > 0 && (
                      <span className="text-base font-normal text-gray-500"> / {budget}h</span>
                    )}
                  </p>
                </div>
                {budget > 0 && (
                  <div className={`text-right ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                    <p className="text-2xl font-bold">{percentage}%</p>
                    <p className="text-xs">
                      {isOverBudget 
                        ? `+${(totalHours - budget).toFixed(1)}h über Budget` 
                        : `${(budget - totalHours).toFixed(1)}h verfügbar`
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {budget > 0 && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${
                      isOverBudget 
                        ? 'bg-gradient-to-r from-red-500 to-red-600' 
                        : percentage >= 75 
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600'
                        : 'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                  />
                </div>
              )}

              {/* Legende */}
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <span>Ist: {totalHours.toFixed(1)}h</span>
                {budget > 0 && <span>Geplant: {budget}h</span>}
              </div>
            </div>

            {/* Aufschlüsselung nach Person */}
            {byUser.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Aufschlüsselung nach Person
                </h4>
                <div className="space-y-2">
                  {byUser.map((user, index) => {
                    const userPercentage = totalHours > 0 ? (user.hours / totalHours) * 100 : 0;
                    return (
                      <motion.div
                        key={user.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.userName}
                          </p>
                          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${userPercentage}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user.hours.toFixed(1)}h
                          </p>
                          <p className="text-xs text-gray-500">
                            {userPercentage.toFixed(0)}%
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Statistik */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
              <span>{activityCount} Zeiteinträge</span>
              <span>{byUser.length} Personen</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
