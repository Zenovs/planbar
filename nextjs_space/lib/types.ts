import type { User, Ticket } from '@prisma/client';

export type { User, Ticket };

// SubTask type (matching Prisma schema)
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  estimatedHours: number | null;
  dueDate: Date | null;
  ticketId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Simple user type with basic info
export type SimpleUser = Pick<User, 'id' | 'name' | 'email'>;

// User with role and creation date
export type UserInfo = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

// Customer project info for ticket relations
export interface CustomerProjectInfo {
  id: string;
  name: string;
  customer: {
    id: string;
    name: string;
    color: string;
  };
  level: {
    id: string;
    name: string;
    color: string;
  };
}

export type TicketWithRelations = Ticket & {
  assignedTo: SimpleUser | null;
  createdBy: SimpleUser;
  customerProject?: CustomerProjectInfo | null;
  _count?: {
    subTasks?: number;
  };
  subTasks?: Array<{ 
    id: string; 
    status?: string;
    completed: boolean;
    estimatedHours: number | null;
  }>;
};

// Alias für Projekt-Terminologie
export type ProjektWithRelations = TicketWithRelations;

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

// SubTask mit Ticket-Informationen für "Tasks heute"
export type SubTaskWithTicket = SubTask & {
  ticket: Ticket;
  assignee: SimpleUser | null;
};
