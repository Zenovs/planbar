import type { User, Ticket, Category } from '@prisma/client';

export type { User, Ticket, Category };

// Simple user type with basic info
export type SimpleUser = Pick<User, 'id' | 'name' | 'email'>;

// User with role and creation date
export type UserInfo = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

export type TicketWithRelations = Ticket & {
  assignedTo: SimpleUser | null;
  createdBy: SimpleUser;
  category: Category | null;
};

export type UserWithStats = UserInfo & {
  _count?: {
    assignedTickets: number;
  };
};

export type TicketStatus = 'open' | 'in_progress' | 'done' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type UserRole = 'member' | 'admin';

export const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Offen' },
  { value: 'in_progress', label: 'In Bearbeitung' },
  { value: 'done', label: 'Erledigt' },
  { value: 'closed', label: 'Geschlossen' },
];

export const PRIORITY_OPTIONS: { value: TicketPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Niedrig', color: 'bg-blue-500' },
  { value: 'medium', label: 'Mittel', color: 'bg-yellow-500' },
  { value: 'high', label: 'Hoch', color: 'bg-orange-500' },
  { value: 'critical', label: 'Kritisch', color: 'bg-red-500' },
];

export const PRIORITY_COLOR_MAP: Record<TicketPriority, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_COLOR_MAP: Record<TicketStatus, string> = {
  open: 'bg-gray-100 text-gray-800 border-gray-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-slate-100 text-slate-800 border-slate-200',
};