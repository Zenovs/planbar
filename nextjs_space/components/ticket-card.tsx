'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User, AlertCircle, ListTodo, Clock } from 'lucide-react';
import { StatusBadge } from './status-badge';
import { PriorityBadge } from './priority-badge';
import { TicketWithRelations } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TicketCardProps {
  ticket: TicketWithRelations;
  index?: number;
}

export function TicketCard({ ticket, index = 0 }: TicketCardProps) {
  const openSubtasksCount = ticket?._count?.subTasks || 0;

  // Berechne Progress und Stunden
  const totalSubtasks = ticket?.subTasks?.length || 0;
  const completedSubtasks = ticket?.subTasks?.filter(st => st.completed).length || 0;
  const progressPercentage = totalSubtasks === 0 ? 100 : Math.round((completedSubtasks / totalSubtasks) * 100);
  
  // Summe der geschätzten Stunden
  const totalEstimatedHours = ticket?.subTasks?.reduce((sum, st) => {
    return sum + (st.estimatedHours || 0);
  }, 0) || 0;

  // Budget-Berechnung
  const estimatedHours = ticket?.estimatedHours || 0;
  const budgetUsedPercentage = estimatedHours > 0 
    ? Math.min(Math.round((totalEstimatedHours / estimatedHours) * 100), 100) 
    : 0;

  return (
    <Link href={`/tickets/${ticket?.id || ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4, shadow: '0 10px 30px rgba(0,0,0,0.15)' }}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 border border-gray-100 active:scale-[0.98] relative overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges - Wrap on mobile */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <StatusBadge status={ticket?.status || 'open'} />
              <PriorityBadge priority={ticket?.priority || 'medium'} />
              {openSubtasksCount > 0 && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1"
                  title={`${openSubtasksCount} offene Subtask${openSubtasksCount > 1 ? 's' : ''}`}
                >
                  <ListTodo className="w-3 h-3" />
                  <span>{openSubtasksCount}</span>
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 line-clamp-2 sm:truncate">
              {ticket?.title || 'Kein Titel'}
            </h3>
            
            {/* Description - Hidden on very small screens */}
            {ticket?.description && (
              <p className="hidden xs:block text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2 sm:mb-3">
                {ticket.description}
              </p>
            )}

            {/* Progress Bar */}
            {totalSubtasks > 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">
                    Fortschritt
                  </span>
                  <span className="text-xs font-semibold text-gray-900">
                    {progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                    className="h-full rounded-full transition-all"
                    style={{
                      background: progressPercentage === 100
                        ? 'linear-gradient(to right, #10b981, #059669)'
                        : progressPercentage >= 50
                        ? 'linear-gradient(to right, #3b82f6, #2563eb)'
                        : 'linear-gradient(to right, #f59e0b, #d97706)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    {completedSubtasks} von {totalSubtasks} Tasks erledigt
                  </span>
                </div>
              </div>
            )}

            {/* Projekt ohne Subtasks - 100% anzeigen */}
            {totalSubtasks === 0 && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-gray-700">
                    Fortschritt
                  </span>
                  <span className="text-xs font-semibold text-green-600">
                    100%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                    className="h-full rounded-full"
                    style={{
                      background: 'linear-gradient(to right, #10b981, #059669)',
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">
                    Keine Subtasks • Projekt bereit
                  </span>
                </div>
              </div>
            )}

            {/* Budget-Anzeige */}
            {estimatedHours > 0 && (
              <div className="mb-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-400">
                    Projekt-Budget
                  </span>
                  <span className={`text-xs font-semibold ${
                    budgetUsedPercentage > 90 
                      ? 'text-red-600' 
                      : budgetUsedPercentage > 75 
                      ? 'text-orange-600' 
                      : 'text-purple-600'
                  }`}>
                    {budgetUsedPercentage}%
                  </span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-900/30 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${budgetUsedPercentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                    className="h-full rounded-full transition-all"
                    style={{
                      background: budgetUsedPercentage > 90
                        ? 'linear-gradient(to right, #dc2626, #991b1b)'
                        : budgetUsedPercentage > 75
                        ? 'linear-gradient(to right, #ea580c, #c2410c)'
                        : 'linear-gradient(to right, #9333ea, #7e22ce)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {totalEstimatedHours}h von {estimatedHours}h verwendet
                  </span>
                  <span className={`text-xs font-medium ${
                    totalEstimatedHours > estimatedHours 
                      ? 'text-red-600' 
                      : 'text-purple-600'
                  }`}>
                    {totalEstimatedHours > estimatedHours 
                      ? `+${(totalEstimatedHours - estimatedHours).toFixed(1)}h über Budget` 
                      : `${(estimatedHours - totalEstimatedHours).toFixed(1)}h verfügbar`}
                  </span>
                </div>
              </div>
            )}
            
            {/* Meta info - Stack or wrap on mobile */}
            <div className="flex flex-col xs:flex-row xs:flex-wrap items-start xs:items-center gap-1 xs:gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
              {ticket?.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {ticket.assignedTo.name || ticket.assignedTo.email}
                  </span>
                </div>
              )}
              {totalEstimatedHours > 0 && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="font-medium">
                    {totalEstimatedHours}h geplant
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Alias für Projekt-Terminologie
export { TicketCard as ProjektCard };
