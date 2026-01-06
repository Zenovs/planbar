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
  const categoryColor = ticket?.category?.color;

  return (
    <Link href={`/tickets/${ticket?.id || ''}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        whileHover={{ y: -4, shadow: '0 10px 30px rgba(0,0,0,0.15)' }}
        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-4 sm:p-6 border border-gray-100 active:scale-[0.98] relative overflow-hidden"
        style={{
          borderLeftWidth: categoryColor ? '4px' : undefined,
          borderLeftColor: categoryColor || undefined,
        }}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges - Wrap on mobile */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <StatusBadge status={ticket?.status || 'open'} />
              <PriorityBadge priority={ticket?.priority || 'medium'} />
              {ticket?.category && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ 
                    backgroundColor: `${ticket.category.color}20`,
                    color: ticket.category.color,
                    borderColor: ticket.category.color,
                    borderWidth: '1px',
                  }}
                >
                  {ticket.category.name}
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
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// Alias für Projekt-Terminologie
export { TicketCard as ProjektCard };
