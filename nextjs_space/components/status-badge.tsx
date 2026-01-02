import { STATUS_COLOR_MAP, STATUS_OPTIONS, TicketStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
  const label = statusOption?.label || status;
  const colorClass = STATUS_COLOR_MAP[status as TicketStatus] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
}
