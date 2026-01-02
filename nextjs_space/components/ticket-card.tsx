'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, User, AlertCircle } from 'lucide-react';
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
  const isOverdue = ticket?.deadline && new Date(ticket.deadline) < new Date() && ticket.status !== 'done' && ticket.status !== 'closed';

  return (
    <Link href={`/tickets/${ticket?.id || ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4, shadow: '0 10px 30px rgba(0,0,0,0.15)' }}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={ticket?.status || 'open'} />
              <PriorityBadge priority={ticket?.priority || 'medium'} />
              {isOverdue && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  Überfällig
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
              {ticket?.title || 'Kein Titel'}
            </h3>
            {ticket?.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {ticket.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {ticket?.assignedTo && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>{ticket.assignedTo.name || ticket.assignedTo.email}</span>
                </div>
              )}
              {ticket?.deadline && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(ticket.deadline), 'dd. MMM yyyy', { locale: de })}
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
