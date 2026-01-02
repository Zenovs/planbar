import { PRIORITY_COLOR_MAP, PRIORITY_OPTIONS, TicketPriority } from '@/lib/types';

interface PriorityBadgeProps {
  priority: string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === priority);
  const label = priorityOption?.label || priority;
  const colorClass = PRIORITY_COLOR_MAP[priority as TicketPriority] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
}
