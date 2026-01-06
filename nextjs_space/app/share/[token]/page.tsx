'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, Clock, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
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
  createdAt: string;
  category: Category | null;
  subTasks: SubTask[];
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTicket();
  }, [token]);

  async function loadTicket() {
    try {
      const res = await fetch(`/api/share?token=${token}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data);
      } else {
        const error = await res.json();
        setError(error.error || 'Ticket nicht gefunden');
      }
    } catch (err) {
      setError('Fehler beim Laden des Tickets');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Lade Ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold mb-2">Zugriff verweigert</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSubTasks = ticket.subTasks.filter(st => st.completed).length;
  const totalSubTasks = ticket.subTasks.length;
  const progress = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            planbar
          </h1>
          <p className="text-sm text-muted-foreground">powered by wireon</p>
        </div>

        {/* Main Ticket Card */}
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{ticket.title}</CardTitle>
                <div className="flex flex-wrap gap-2 items-center">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.category && (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${ticket.category.color}20`,
                        color: ticket.category.color
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: ticket.category.color }}
                      />
                      {ticket.category.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {ticket.description && (
              <CardDescription className="mt-4 text-base">
                {ticket.description}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Meta Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ticket.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fälligkeitsdatum:</span>
                  <span className="font-medium">
                    {new Date(ticket.deadline).toLocaleDateString('de-DE')}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Erstellt am:</span>
                <span className="font-medium">
                  {new Date(ticket.createdAt).toLocaleDateString('de-DE')}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {totalSubTasks > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Fortschritt</span>
                  <span className="text-muted-foreground">
                    {completedSubTasks} / {totalSubTasks} erledigt
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">
                  {Math.round(progress)}% abgeschlossen
                </p>
              </div>
            )}

            {/* Sub-Tasks */}
            {ticket.subTasks.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Aufgaben</h3>
                <div className="space-y-2">
                  {ticket.subTasks.map((subTask) => (
                    <motion.div
                      key={subTask.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        subTask.completed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {subTask.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <span
                        className={`flex-1 ${
                          subTask.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {subTask.title}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned To */}
            {ticket.assignedTo && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Zugewiesen an:{' '}
                  <span className="font-medium text-foreground">
                    {ticket.assignedTo.name || ticket.assignedTo.email}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>Diese Ansicht ist öffentlich und erfordert keine Anmeldung.</p>
        </div>
      </motion.div>
    </div>
  );
}
