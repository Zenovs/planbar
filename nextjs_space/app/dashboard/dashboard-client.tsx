'use client';

import { Header } from '@/components/header';
import { StatsCard } from '@/components/stats-card';
import { TicketCard } from '@/components/ticket-card';
import { TodayTasksCard } from '@/components/today-tasks-card';
import { Ticket, Clock, CheckCircle, ListTodo, Plus, ArrowRight, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TicketWithRelations, UserWithStats, SimpleUser, SubTaskWithTicket } from '@/lib/types';
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
  todaySubTasks: SubTaskWithTicket[];
}

export function DashboardClient({ session, stats, recentTickets, users, todaySubTasks }: DashboardClientProps) {
  const handleExportAllToCalendar = () => {
    const exportUrl = `/api/calendar/export`;
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header Section - Stack on mobile */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Willkommen, {session?.user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Übersicht deiner Tickets und Team.
            </p>
          </div>

        </div>

        {/* Stats Grid - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Gesamt"
            value={stats?.total || 0}
            icon={ListTodo}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            index={0}
            href="/tasks?filter=all"
          />
          <StatsCard
            title="Offen"
            value={stats?.open || 0}
            icon={Ticket}
            color="bg-gradient-to-br from-gray-500 to-gray-600"
            index={1}
            href="/tasks?filter=open"
          />
          <StatsCard
            title="In Bearbeitung"
            value={stats?.inProgress || 0}
            icon={Clock}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            index={2}
            href="/tasks?filter=open"
          />
          <StatsCard
            title="Erledigt"
            value={stats?.done || 0}
            icon={CheckCircle}
            color="bg-gradient-to-br from-green-500 to-green-600"
            index={3}
            href="/tasks?filter=done"
          />
        </div>

        {/* Tasks heute Section */}
        <div className="mb-6 sm:mb-8">
          <TodayTasksCard tasks={todaySubTasks} />
        </div>

        {/* Recent Tickets Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Neueste Projekte</h2>
            <div className="flex gap-2">
              <Link href="/tickets/new" className="flex-1 sm:flex-none">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all min-h-[44px]"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm sm:text-base">Neues Projekt</span>
                </motion.button>
              </Link>
              <Link href="/tickets" className="flex-1 sm:flex-none">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-all min-h-[44px]"
                >
                  <span className="text-sm sm:text-base">Alle</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
          </div>

          {recentTickets && recentTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {recentTickets.slice(0, 6).map((ticket, index) => (
                <TicketCard key={ticket?.id} ticket={ticket} index={index} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Ticket className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4 text-sm sm:text-base">Noch keine Tickets vorhanden</p>
              <Link href="/tickets/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all min-h-[48px]"
                >
                  Erstes Ticket erstellen
                </motion.button>
              </Link>
            </div>
          )}
        </div>

        {/* Team Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Team-Übersicht</h2>
            <Link href="/team">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium min-h-[44px] px-2"
              >
                <span className="text-sm sm:text-base">Zum Team</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
          </div>

          {users && users.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {users.slice(0, 6).map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate text-sm sm:text-base">{user.name || 'Unbekannt'}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {user._count?.assignedTickets || 0} Tickets
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8 text-sm sm:text-base">Keine Teammitglieder gefunden</p>
          )}
        </div>
      </main>
    </div>
  );
}
