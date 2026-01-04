'use client';

import { Header } from '@/components/header';
import { StatsCard } from '@/components/stats-card';
import { TicketCard } from '@/components/ticket-card';
import { Ticket, Clock, CheckCircle, ListTodo, Plus, ArrowRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TicketWithRelations, UserWithStats, SimpleUser } from '@/lib/types';
import { Session } from 'next-auth';

interface DashboardClientProps {
  session: Session;
  stats: {
    total: number;
    open: number;
    inProgress: number;
    done: number;
  };
  recentTickets: TicketWithRelations[];
  users: UserWithStats[];
}

export function DashboardClient({ session, stats, recentTickets, users }: DashboardClientProps) {
  const handleExportAllToCalendar = () => {
    const exportUrl = `/api/calendar/export`;
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Willkommen zurück, {session?.user?.name || 'User'}!
            </h1>
            <p className="text-gray-600">
              Hier ist eine Übersicht über deine Tickets und das Team.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportAllToCalendar}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2 shadow-md"
          >
            <CalendarDays className="w-5 h-5" />
            Tickets exportieren
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Gesamt"
            value={stats?.total || 0}
            icon={ListTodo}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            index={0}
          />
          <StatsCard
            title="Offen"
            value={stats?.open || 0}
            icon={Ticket}
            color="bg-gradient-to-br from-gray-500 to-gray-600"
            index={1}
          />
          <StatsCard
            title="In Bearbeitung"
            value={stats?.inProgress || 0}
            icon={Clock}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            index={2}
          />
          <StatsCard
            title="Erledigt"
            value={stats?.done || 0}
            icon={CheckCircle}
            color="bg-gradient-to-br from-green-500 to-green-600"
            index={3}
          />
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Neueste Tickets</h2>
            <div className="flex gap-2">
              <Link href="/tickets/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Neues Ticket
                </motion.button>
              </Link>
              <Link href="/tickets">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Alle anzeigen
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </div>

          {recentTickets && recentTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentTickets.slice(0, 6).map((ticket, index) => (
                <TicketCard key={ticket?.id} ticket={ticket} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Ticket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Noch keine Tickets vorhanden</p>
              <Link href="/tickets/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
                >
                  Erstes Ticket erstellen
                </motion.button>
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Team-Übersicht</h2>
            <Link href="/team">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Zum Team
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>

          {users && users.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user, index) => (
                <motion.div
                  key={user?.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">
                        {user?.name || user?.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {user?._count?.assignedTickets || 0} offene Tickets
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">Keine Team-Mitglieder gefunden</p>
          )}
        </div>
      </main>
    </div>
  );
}
