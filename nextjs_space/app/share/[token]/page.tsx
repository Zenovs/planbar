'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import StatusBadge from '@/components/status-badge';
import PriorityBadge from '@/components/priority-badge';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: string | null;
  category: Category | null;
  assignedTo: { name: string; email: string } | null;
  subTasks: SubTask[];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export default function PublicSharePage() {
  const params = useParams();
  const token = params?.token as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    const fetchTicket = async () => {
      try {
        const response = await fetch(`/api/share?token=${token}`);
        
        if (!response.ok) {
          throw new Error('Ticket nicht gefunden oder Freigabe ist deaktiviert');
        }

        const data = await response.json();
        setTicket(data);
      } catch (err: any) {
        setError(err.message || 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Lade Aufgabe...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Aufgabe nicht gefunden</h2>
          <p className="text-gray-600">{error}</p>
        </motion.div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; icon: typeof Circle }> = {
    open: { label: 'Offen', icon: Circle },
    in_progress: { label: 'In Bearbeitung', icon: Clock },
    done: { label: 'Erledigt', icon: CheckCircle2 },
  };

  const statusInfo = statusConfig[ticket.status] || statusConfig.open;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">planbar</h1>
          <p className="text-gray-600">Aufgaben-Status</p>
        </motion.div>

        {/* Main Ticket Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3">{ticket.title}</CardTitle>
                  {ticket.description && (
                    <CardDescription className="text-base">
                      {ticket.description}
                    </CardDescription>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                {ticket.category && (
                  <Badge
                    style={{
                      backgroundColor: `${ticket.category.color}20`,
                      color: ticket.category.color,
                      borderColor: ticket.category.color,
                    }}
                    variant="outline"
                  >
                    {ticket.category.name}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Progress Section */}
              {ticket.subTasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Fortschritt</h3>
                    <span className="text-2xl font-bold text-blue-600">
                      {ticket.progress}%
                    </span>
                  </div>
                  <Progress value={ticket.progress} className="h-3" />
                  <p className="text-sm text-gray-600">
                    {ticket.subTasks.filter(st => st.completed).length} von {ticket.subTasks.length} Aufgaben erledigt
                  </p>
                </div>
              )}

              {/* Sub-Tasks */}
              {ticket.subTasks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Aufgaben-Checkliste</h3>
                  <div className="space-y-2">
                    {ticket.subTasks.map((subTask, index) => (
                      <motion.div
                        key={subTask.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          subTask.completed
                            ? 'bg-green-50 border-green-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        {subTask.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span
                          className={`flex-1 ${
                            subTask.completed
                              ? 'text-green-700 line-through'
                              : 'text-gray-900'
                          }`}
                        >
                          {subTask.title}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meta Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                {ticket.assignedTo && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="h-5 w-5" />
                    <div>
                      <p className="text-xs text-gray-500">Zugewiesen an</p>
                      <p className="font-medium">{ticket.assignedTo.name}</p>
                    </div>
                  </div>
                )}
                {ticket.deadline && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-5 w-5" />
                    <div>
                      <p className="text-xs text-gray-500">Fällig am</p>
                      <p className="font-medium">
                        {new Date(ticket.deadline).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Last Updated */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Zuletzt aktualisiert:{' '}
                  {new Date(ticket.updatedAt).toLocaleString('de-DE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-gray-600"
        >
          <p className="text-sm">powered by <span className="font-semibold">wireon</span></p>
        </motion.div>
      </div>
    </div>
  );
}
