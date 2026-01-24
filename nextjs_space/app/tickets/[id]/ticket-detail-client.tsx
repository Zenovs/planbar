'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  Edit2, 
  Trash2, 
  Save, 
  Plus, 
  X, 
  Check, 
  Share2, 
  Copy,
  CheckCircle2,
  Circle,
  MoreVertical,
  Clock,
  User as UserIcon,
  Users,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Filter,
  Bell,
  BellOff,
  List,
  LayoutGrid,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';

import { ProjectNotes } from '@/components/project-notes';
import { MilestoneTimeline } from '@/components/milestone-timeline';
import { RichTextEditor, RichTextDisplay } from '@/components/richtext-editor';
import { Header } from '@/components/header';

interface User {
  id: string;
  name: string | null;
  email: string;
  weeklyHours?: number;
  workloadPercent?: number;
}

interface Team {
  id: string;
  name: string;
}

interface SubTask {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  status?: string;
  position: number;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  assigneeId?: string | null;
  assignee?: User | null;
}

interface ResourceInfo {
  id: string;
  name: string | null;
  email: string;
  freeHours: number;
  assignedHours: number;
  utilizationPercent: number;
  openSubTasks: number;
}

interface Projekt {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToId: string | null;
  teamId: string | null;
  projectManagerId: string | null;
  shareToken: string | null;
  shareEnabled: boolean;
  estimatedHours?: number | null;
  assignedTo?: User | null;
  createdBy?: User | null;
  team?: Team | null;
  projectManager?: User | null;
  subTasks?: SubTask[];
}

interface ProjektDetailClientProps {
  ticket: Projekt;
  users: User[];
  teams: Team[];
}

export function ProjektDetailClient({ ticket: initialTicket, users, teams }: ProjektDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<Projekt>(initialTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newSubTaskDescription, setNewSubTaskDescription] = useState('');
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState('');
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState('');
  const [newSubTaskHours, setNewSubTaskHours] = useState('');
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editingSubTaskTitle, setEditingSubTaskTitle] = useState('');
  const [editingSubTaskDescription, setEditingSubTaskDescription] = useState('');
  const [expandedSubTaskId, setExpandedSubTaskId] = useState<string | null>(null);
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [collapsedDescriptions, setCollapsedDescriptions] = useState<Set<string>>(new Set());
  
  // Subtask Filter States
  const [subtaskSearch, setSubtaskSearch] = useState('');
  const [subtaskStatusFilter, setSubtaskStatusFilter] = useState<'all' | 'open' | 'completed'>('all');
  const [subtaskAssigneeFilter, setSubtaskAssigneeFilter] = useState<string>('all');
  
  // Reminder Bell States (blockiert für 10 Minuten nach Klick)
  const [bellBlockedUntil, setBellBlockedUntil] = useState<Record<string, number>>({});
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // View Mode State (list / kanban)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedSubTask, setDraggedSubTask] = useState<string | null>(null);
  const [selectedKanbanSubTask, setSelectedKanbanSubTask] = useState<SubTask | null>(null);

  // Gefilterte Subtasks
  const filteredSubTasks = useMemo(() => {
    let filtered = ticket.subTasks || [];
    
    // Textsuche
    if (subtaskSearch.trim()) {
      const searchLower = subtaskSearch.toLowerCase();
      filtered = filtered.filter((st: SubTask) => 
        st.title.toLowerCase().includes(searchLower) ||
        (st.description && st.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Status-Filter
    if (subtaskStatusFilter === 'open') {
      filtered = filtered.filter((st: SubTask) => !st.completed);
    } else if (subtaskStatusFilter === 'completed') {
      filtered = filtered.filter((st: SubTask) => st.completed);
    }
    
    // Zuordnungs-Filter
    if (subtaskAssigneeFilter !== 'all') {
      if (subtaskAssigneeFilter === 'unassigned') {
        filtered = filtered.filter((st: SubTask) => !st.assigneeId);
      } else {
        filtered = filtered.filter((st: SubTask) => st.assigneeId === subtaskAssigneeFilter);
      }
    }
    
    return filtered;
  }, [ticket.subTasks, subtaskSearch, subtaskStatusFilter, subtaskAssigneeFilter]);

  // Subtask-Statistiken
  const subtaskStats = useMemo(() => {
    const all = ticket.subTasks || [];
    const completed = all.filter((st: SubTask) => st.completed).length;
    const open = all.length - completed;
    return { total: all.length, completed, open };
  }, [ticket.subTasks]);

  // Prüfen ob Glocke blockiert ist
  const isBellBlocked = (subTaskId: string): boolean => {
    const blockedUntil = bellBlockedUntil[subTaskId];
    if (!blockedUntil) return false;
    return Date.now() < blockedUntil;
  };

  // Verbleibende Blockierzeit in Minuten
  const getRemainingBlockTime = (subTaskId: string): number => {
    const blockedUntil = bellBlockedUntil[subTaskId];
    if (!blockedUntil) return 0;
    const remaining = blockedUntil - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000));
  };

  // Erinnerung senden
  const handleSendReminder = async (subTaskId: string) => {
    if (isBellBlocked(subTaskId)) return;
    
    setSendingReminder(subTaskId);
    try {
      const res = await fetch('/api/subtasks/remind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subTaskId }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Glocke für 10 Minuten blockieren
        setBellBlockedUntil(prev => ({
          ...prev,
          [subTaskId]: Date.now() + 10 * 60 * 1000 // 10 Minuten
        }));
        toast.success(data.message || 'Erinnerung gesendet');
      } else {
        toast.error(data.error || 'Fehler beim Senden');
      }
    } catch (error) {
      toast.error('Fehler beim Senden der Erinnerung');
    } finally {
      setSendingReminder(null);
    }
  };

  // Status-Update für Kanban Drag & Drop
  const handleUpdateSubTaskStatus = async (subTaskId: string, newStatus: string) => {
    const isCompleted = newStatus === 'done';
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          completed: isCompleted
        }),
      });
      if (res.ok) {
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? { ...st, status: newStatus, completed: isCompleted } : st
          ),
        });
        toast.success('Status aktualisiert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  // Kanban Spalten-Definitionen
  const kanbanColumns = [
    { id: 'open', title: 'Offen', color: 'bg-gray-100 dark:bg-gray-800' },
    { id: 'in_progress', title: 'In Bearbeitung', color: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'done', title: 'Erledigt', color: 'bg-green-50 dark:bg-green-900/20' },
  ];

  // SubTasks nach Status gruppieren (completed=true -> immer "done")
  const subtasksByStatus = useMemo(() => {
    const grouped: Record<string, SubTask[]> = {
      open: [],
      in_progress: [],
      done: [],
    };
    filteredSubTasks.forEach((st: SubTask) => {
      // Wenn completed=true, immer in "done" Spalte, unabhängig vom status Feld
      let effectiveStatus: string;
      if (st.completed) {
        effectiveStatus = 'done';
      } else {
        effectiveStatus = st.status || 'open';
      }
      if (grouped[effectiveStatus]) {
        grouped[effectiveStatus].push(st);
      }
    });
    return grouped;
  }, [filteredSubTasks]);

  const toggleDescriptionCollapse = (subTaskId: string) => {
    setCollapsedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(subTaskId)) {
        next.delete(subTaskId);
      } else {
        next.add(subTaskId);
      }
      return next;
    });
  };
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [showResourcePanel, setShowResourcePanel] = useState(false);

  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    assignedToId: ticket.assignedToId || 'none',
    teamId: ticket.teamId || 'none',
    projectManagerId: ticket.projectManagerId || 'none',
    estimatedHours: ticket.estimatedHours?.toString() || '',
  });

  // Ressourcen laden (basierend auf SubTask-Deadlines)
  const loadResources = useCallback(async (deadline?: string) => {
    try {
      const url = deadline 
        ? `/api/resources?deadline=${deadline}`
        : '/api/resources';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources);
      }
    } catch (error) {
      console.error('Error loading resources:', error);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Titel darf nicht leer sein');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          status: formData.status,
          priority: formData.priority,
          assignedToId: formData.assignedToId === 'none' ? null : formData.assignedToId,
          teamId: formData.teamId === 'none' ? null : formData.teamId,
          projectManagerId: formData.projectManagerId === 'none' ? null : formData.projectManagerId,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setIsEditing(false);
        toast.success('Projekt aktualisiert');
        router.refresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Projekt wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Projekt gelöscht');
        router.push('/tickets');
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          enabled: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setShareUrl(`${window.location.origin}/share/${data.shareToken}`);
        setTicket({ ...ticket, shareToken: data.shareToken, shareEnabled: true });
        setShowShareDialog(true);
        toast.success('Share-Link erstellt');
      } else {
        toast.error('Fehler beim Erstellen des Links');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Links');
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link kopiert!');
  };

  const handleToggleShareEnabled = async () => {
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          enabled: !ticket.shareEnabled,
        }),
      });

      if (res.ok) {
        setTicket({ ...ticket, shareEnabled: !ticket.shareEnabled });
        toast.success(ticket.shareEnabled ? 'Share-Link deaktiviert' : 'Share-Link aktiviert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleAddSubTask = async () => {
    if (!newSubTaskTitle.trim()) return;

    try {
      const res = await fetch('/api/subtasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticket.id,
          title: newSubTaskTitle,
          description: newSubTaskDescription || null,
          position: (ticket.subTasks || []).length,
          dueDate: newSubTaskDueDate || null,
          assigneeId: newSubTaskAssignee || null,
          estimatedHours: newSubTaskHours || null,
        }),
      });

      if (res.ok) {
        const newSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: [...(ticket.subTasks || []), newSubTask],
        });
        setNewSubTaskTitle('');
        setNewSubTaskDescription('');
        setNewSubTaskDueDate('');
        setNewSubTaskAssignee('');
        setNewSubTaskHours('');
        setShowSubTaskForm(false);
        toast.success('Sub-Task hinzugefügt');
        // Ressourcen neu laden, da eine neue Aufgabe zugewiesen wurde
        await loadResources();
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
  };

  const handleUpdateSubTaskDescription = async (subTaskId: string, description: string) => {
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? { ...st, description: updatedSubTask.description } : st
          ),
        });
        // Bearbeitungsmodus beenden
        setExpandedSubTaskId(null);
        setEditingSubTaskDescription('');
        toast.success('Beschreibung aktualisiert');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateSubTask = async (subTaskId: string, data: { assigneeId?: string | null; estimatedHours?: number | null }) => {
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? { ...st, ...updatedSubTask } : st
          ),
        });
        // Ressourcen neu laden, da sich Zuweisung/Stunden geändert haben
        await loadResources();
        toast.success('Sub-Task aktualisiert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateSubTaskDueDate = async (subTaskId: string, dueDate: string | null) => {
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      });

      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? updatedSubTask : st
          ),
        });
        // Ressourcen neu laden, da die Deadline die Verfügbarkeit beeinflusst
        await loadResources();
        toast.success('Deadline aktualisiert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleUpdateSubTaskTitle = async (subTaskId: string) => {
    if (!editingSubTaskTitle.trim()) {
      setEditingSubTaskId(null);
      return;
    }
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingSubTaskTitle.trim() }),
      });

      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? updatedSubTask : st
          ),
        });
        toast.success('Sub-Task aktualisiert');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
    setEditingSubTaskId(null);
    setEditingSubTaskTitle('');
  };

  const startEditingSubTask = (subTask: SubTask) => {
    setEditingSubTaskId(subTask.id);
    setEditingSubTaskTitle(subTask.title);
  };

  const handleToggleSubTask = async (subTaskId: string, completed: boolean) => {
    const newCompleted = !completed;
    const newStatus = newCompleted ? 'done' : 'open';
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted, status: newStatus }),
      });

      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? { ...updatedSubTask, status: newStatus } : st
          ),
        });
        // Ressourcen neu laden, da sich die Verfügbarkeit geändert hat
        await loadResources();
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleDeleteSubTask = async (subTaskId: string) => {
    if (!confirm('Sub-Task wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).filter((st: SubTask) => st.id !== subTaskId),
        });
        // Ressourcen neu laden, da sich die Verfügbarkeit geändert hat
        await loadResources();
        toast.success('Sub-Task gelöscht');
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const progress = ticket.subTasks && ticket.subTasks.length > 0
    ? Math.round((ticket.subTasks.filter((st: SubTask) => st.completed).length / ticket.subTasks.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />
      <div className="p-3 sm:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Page Header - Mobile optimized */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8"
          >
            <h1 className="text-xl sm:text-3xl font-bold">Projekt Details</h1>
          
          {/* Desktop actions */}
          <div className="hidden sm:flex gap-2">
            <Button onClick={handleGenerateShareLink} variant="outline" size="sm">
              <Share2 size={16} className="mr-2" />
              Teilen
            </Button>
            {!isEditing ? (
              <>
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  <Edit2 size={16} className="mr-2" />
                  Bearbeiten
                </Button>
                <Button onClick={handleDelete} variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 size={16} className="mr-2" />
                  Löschen
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleSave} size="sm" disabled={isSaving}>
                  <Save size={16} className="mr-2" />
                  Speichern
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                  <X size={16} />
                </Button>
              </>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex sm:hidden gap-2 w-full">
            {isEditing ? (
              <>
                <Button onClick={handleSave} size="sm" disabled={isSaving} className="flex-1 min-h-[44px]">
                  <Save size={16} className="mr-2" />
                  Speichern
                </Button>
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">
                  <X size={18} />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleGenerateShareLink} variant="outline" size="sm" className="flex-1 min-h-[44px]">
                  <Share2 size={16} className="mr-2" />
                  Teilen
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px]">
                      <MoreVertical size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit2 size={16} className="mr-2" />
                      Bearbeiten
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                      <Trash2 size={16} className="mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </motion.div>

        {/* Content Grid - Stack on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="relative overflow-hidden">
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="text-lg sm:text-2xl font-bold mb-3 min-h-[48px]"
                      />
                    ) : (
                      <CardTitle className="text-lg sm:text-2xl">{ticket.title}</CardTitle>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                  {isEditing ? (
                    <div className="flex flex-wrap gap-2 w-full">
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger className="w-full sm:w-40 min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Offen</SelectItem>
                          <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                          <SelectItem value="done">Erledigt</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger className="w-full sm:w-32 min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Niedrig</SelectItem>
                          <SelectItem value="medium">Mittel</SelectItem>
                          <SelectItem value="high">Hoch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <>
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div>
                  <Label className="text-sm font-medium">Beschreibung</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={6}
                      className="mt-2 min-h-[120px] text-base"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {ticket.description || 'Keine Beschreibung'}
                    </p>
                  )}
                </div>

                {/* Vorgabezeit */}
                <div>
                  <Label className="text-sm font-medium flex items-center gap-1">
                    <Clock size={14} />
                    Vorgabezeit (Stunden)
                  </Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.estimatedHours}
                      onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                      className="mt-2 w-32"
                      placeholder="z.B. 40"
                    />
                  ) : (
                    <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                      {ticket.estimatedHours ? `${ticket.estimatedHours} Stunden` : 'Nicht festgelegt'}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sub-Tasks */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Sub-Tasks ({(ticket.subTasks || []).length})</CardTitle>
                  {/* View Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded-md transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="Listenansicht"
                    >
                      <List size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode('kanban')}
                      className={`p-2 rounded-md transition-all ${
                        viewMode === 'kanban' 
                          ? 'bg-white dark:bg-gray-700 shadow-sm text-primary' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="Kanban-Ansicht"
                    >
                      <LayoutGrid size={18} />
                    </button>
                  </div>
                </div>
                {ticket.subTasks && ticket.subTasks.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Fortschritt</span>
                      <span className="font-bold">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-2 sm:space-y-3">
                {/* SubTask Filter */}
                {subtaskStats.total > 0 && (
                  <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 mb-4 space-y-3">
                    {/* Statistiken */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {subtaskStats.total} Sub-Tasks
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={14} />
                          {subtaskStats.completed} erledigt
                        </span>
                        <span className="flex items-center gap-1 text-orange-600">
                          <Circle size={14} />
                          {subtaskStats.open} offen
                        </span>
                      </div>
                    </div>
                    
                    {/* Filter-Zeile */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* Suche */}
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={subtaskSearch}
                          onChange={(e) => setSubtaskSearch(e.target.value)}
                          placeholder="Sub-Tasks durchsuchen..."
                          className="pl-9 min-h-[40px] text-sm"
                        />
                        {subtaskSearch && (
                          <button
                            onClick={() => setSubtaskSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <X size={14} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                      
                      {/* Status-Filter */}
                      <select
                        value={subtaskStatusFilter}
                        onChange={(e) => setSubtaskStatusFilter(e.target.value as 'all' | 'open' | 'completed')}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[40px] bg-white dark:bg-gray-700 text-sm min-w-[120px]"
                      >
                        <option value="all">Alle Status</option>
                        <option value="open">Offen</option>
                        <option value="completed">Erledigt</option>
                      </select>
                      
                      {/* Zuordnungs-Filter */}
                      <select
                        value={subtaskAssigneeFilter}
                        onChange={(e) => setSubtaskAssigneeFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[40px] bg-white dark:bg-gray-700 text-sm min-w-[140px]"
                      >
                        <option value="all">Alle Zuweisungen</option>
                        <option value="unassigned">Nicht zugewiesen</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Filter-Info */}
                    {(subtaskSearch || subtaskStatusFilter !== 'all' || subtaskAssigneeFilter !== 'all') && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {filteredSubTasks.length} von {subtaskStats.total} Sub-Tasks angezeigt
                        </span>
                        <button
                          onClick={() => {
                            setSubtaskSearch('');
                            setSubtaskStatusFilter('all');
                            setSubtaskAssigneeFilter('all');
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Filter zurücksetzen
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Keine Ergebnisse */}
                {filteredSubTasks.length === 0 && subtaskStats.total > 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Sub-Tasks gefunden</p>
                    <button
                      onClick={() => {
                        setSubtaskSearch('');
                        setSubtaskStatusFilter('all');
                        setSubtaskAssigneeFilter('all');
                      }}
                      className="text-blue-600 hover:underline text-sm mt-1"
                    >
                      Filter zurücksetzen
                    </button>
                  </div>
                )}

                {/* KANBAN VIEW */}
                {viewMode === 'kanban' && filteredSubTasks.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {kanbanColumns.map((column) => (
                      <div
                        key={column.id}
                        className={`${column.color} rounded-lg p-3 min-h-[200px]`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('ring-2', 'ring-primary');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('ring-2', 'ring-primary');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('ring-2', 'ring-primary');
                          if (draggedSubTask) {
                            handleUpdateSubTaskStatus(draggedSubTask, column.id);
                            setDraggedSubTask(null);
                          }
                        }}
                      >
                        <h4 className="font-medium text-sm mb-3 flex items-center justify-between">
                          <span>{column.title}</span>
                          <span className="bg-white dark:bg-gray-700 text-xs px-2 py-1 rounded-full">
                            {subtasksByStatus[column.id]?.length || 0}
                          </span>
                        </h4>
                        <div className="space-y-2">
                          {(subtasksByStatus[column.id] || []).map((subTask: SubTask) => (
                            <motion.div
                              key={subTask.id}
                              draggable
                              onDragStart={() => setDraggedSubTask(subTask.id)}
                              onDragEnd={() => setDraggedSubTask(null)}
                              onClick={() => setSelectedKanbanSubTask(subTask)}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className={`bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                                column.id === 'done' ? 'border-l-green-500' :
                                column.id === 'in_progress' ? 'border-l-blue-500' :
                                'border-l-gray-300'
                              } ${draggedSubTask === subTask.id ? 'opacity-50 cursor-grabbing' : ''}`}
                            >
                              <div className="flex items-start gap-2">
                                <GripVertical size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {subTask.title}
                                  </p>
                                  {subTask.assignee && (
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                      <UserIcon size={10} />
                                      {subTask.assignee.name || subTask.assignee.email}
                                    </p>
                                  )}
                                  {subTask.dueDate && (
                                    <p className={`text-xs mt-1 ${
                                      new Date(subTask.dueDate) < new Date() && !subTask.completed 
                                        ? 'text-red-600' 
                                        : 'text-gray-500'
                                    }`}>
                                      <Clock size={10} className="inline mr-1" />
                                      {new Date(subTask.dueDate).toLocaleDateString('de-DE')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && filteredSubTasks.map((subTask: SubTask) => {
                  const isOverdue = subTask.dueDate && new Date(subTask.dueDate) < new Date() && !subTask.completed;
                  const isUpcoming = subTask.dueDate && !isOverdue && 
                    new Date(subTask.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) && !subTask.completed;
                  
                  return (
                    <motion.div
                      key={subTask.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`flex flex-col gap-2 p-3 rounded-lg ${
                        isOverdue ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                        isUpcoming ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                        'bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleToggleSubTask(subTask.id, subTask.completed)}
                          className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
                        >
                          {subTask.completed ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                          ) : (
                            <Circle className={`h-6 w-6 ${isOverdue ? 'text-red-500' : isUpcoming ? 'text-orange-500' : 'text-gray-400'}`} />
                          )}
                        </button>
                        {editingSubTaskId === subTask.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingSubTaskTitle}
                              onChange={(e) => setEditingSubTaskTitle(e.target.value)}
                              className="flex-1 min-h-[36px] text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleUpdateSubTaskTitle(subTask.id);
                                } else if (e.key === 'Escape') {
                                  setEditingSubTaskId(null);
                                  setEditingSubTaskTitle('');
                                }
                              }}
                            />
                            <Button
                              onClick={() => handleUpdateSubTaskTitle(subTask.id)}
                              size="sm"
                              variant="ghost"
                              className="text-green-600 min-w-[36px] min-h-[36px]"
                            >
                              <Check size={16} />
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingSubTaskId(null);
                                setEditingSubTaskTitle('');
                              }}
                              size="sm"
                              variant="ghost"
                              className="text-gray-500 min-w-[36px] min-h-[36px]"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={`flex-1 text-sm sm:text-base cursor-pointer hover:text-primary ${
                              subTask.completed ? 'line-through text-gray-500' : 
                              isOverdue ? 'text-red-700 dark:text-red-300 font-medium' : ''
                            }`}
                            onClick={() => startEditingSubTask(subTask)}
                            title="Klicken zum Bearbeiten"
                          >
                            {subTask.title}
                          </span>
                        )}
                        {/* Glocke für Erinnerung - nur wenn jemand zugewiesen ist */}
                        {subTask.assigneeId && !subTask.completed && (
                          <Button
                            onClick={() => handleSendReminder(subTask.id)}
                            size="sm"
                            variant="ghost"
                            disabled={isBellBlocked(subTask.id) || sendingReminder === subTask.id}
                            className={`min-w-[44px] min-h-[44px] ${
                              isBellBlocked(subTask.id) 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                            }`}
                            title={isBellBlocked(subTask.id) 
                              ? `Blockiert für ${getRemainingBlockTime(subTask.id)} Min.` 
                              : 'Erinnerung senden'}
                          >
                            {sendingReminder === subTask.id ? (
                              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            ) : isBellBlocked(subTask.id) ? (
                              <BellOff size={16} />
                            ) : (
                              <Bell size={16} />
                            )}
                          </Button>
                        )}
                        <Button
                          onClick={() => startEditingSubTask(subTask)}
                          size="sm"
                          variant="ghost"
                          className="text-gray-500 hover:text-primary min-w-[44px] min-h-[44px]"
                        >
                          <Edit2 size={16} />
                        </Button>
                        <Button
                          onClick={() => handleDeleteSubTask(subTask.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 min-w-[44px] min-h-[44px]"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      {/* SubTask Details */}
                      <div className="flex flex-wrap items-center gap-2 ml-10 text-xs">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3 h-3 text-gray-500" />
                          <select
                            value={subTask.assigneeId || ''}
                            onChange={(e) => handleUpdateSubTask(subTask.id, { assigneeId: e.target.value || null })}
                            className="border rounded px-2 py-1 min-h-[32px] bg-white dark:bg-gray-700 text-xs"
                          >
                            <option value="">Niemand</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-500" />
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={subTask.estimatedHours || ''}
                            onChange={(e) => handleUpdateSubTask(subTask.id, { estimatedHours: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="h"
                            className="w-16 border rounded px-2 py-1 min-h-[32px] bg-white dark:bg-gray-700 text-xs"
                          />
                          <span className="text-gray-500">Std</span>
                        </div>
                        <input
                          type="date"
                          value={subTask.dueDate ? new Date(subTask.dueDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => handleUpdateSubTaskDueDate(subTask.id, e.target.value || null)}
                          className={`text-xs px-2 py-1 border rounded min-h-[32px] ${
                            isOverdue ? 'border-red-300 bg-red-100 dark:bg-red-900/30' :
                            isUpcoming ? 'border-orange-300 bg-orange-100 dark:bg-orange-900/30' :
                            'bg-white dark:bg-gray-700'
                          }`}
                        />
                      </div>
                      {subTask.assignee && (
                        <div className="ml-10 text-xs text-gray-500">
                          <Badge variant="secondary" className="text-xs">
                            {subTask.assignee.name || subTask.assignee.email}
                            {subTask.estimatedHours && ` • ${subTask.estimatedHours}h`}
                          </Badge>
                        </div>
                      )}
                      
                      {/* Beschreibung anzeigen/bearbeiten - Akkordeon */}
                      {(subTask.description || expandedSubTaskId === subTask.id) && (
                        <div className="ml-10 mt-2">
                          {expandedSubTaskId === subTask.id ? (
                            // Bearbeitungsmodus
                            <div className="space-y-2 border rounded-lg p-3 bg-white dark:bg-gray-800">
                              <RichTextEditor
                                value={editingSubTaskDescription}
                                onChange={setEditingSubTaskDescription}
                                placeholder="Beschreibung hinzufügen..."
                                minHeight="80px"
                              />
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleUpdateSubTaskDescription(subTask.id, editingSubTaskDescription)}
                                  size="sm"
                                  className="min-h-[36px]"
                                >
                                  <Save size={14} className="mr-1" />
                                  Speichern
                                </Button>
                                <Button
                                  onClick={() => {
                                    setExpandedSubTaskId(null);
                                    setEditingSubTaskDescription('');
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="min-h-[36px]"
                                >
                                  Abbrechen
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Akkordeon-Ansicht
                            <div className="border rounded-lg bg-gray-50 dark:bg-gray-700/50 overflow-hidden">
                              {/* Akkordeon Header */}
                              <button
                                onClick={() => toggleDescriptionCollapse(subTask.id)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                              >
                                <span className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                                  <FileText size={14} />
                                  Beschreibung
                                </span>
                                {collapsedDescriptions.has(subTask.id) ? (
                                  <ChevronDown size={16} className="text-gray-500" />
                                ) : (
                                  <ChevronUp size={16} className="text-gray-500" />
                                )}
                              </button>
                              
                              {/* Akkordeon Content */}
                              <motion.div
                                initial={false}
                                animate={{
                                  height: collapsedDescriptions.has(subTask.id) ? 0 : 'auto',
                                  opacity: collapsedDescriptions.has(subTask.id) ? 0 : 1
                                }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div 
                                  className="px-3 pb-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                  onClick={() => {
                                    setExpandedSubTaskId(subTask.id);
                                    setEditingSubTaskDescription(subTask.description || '');
                                  }}
                                  title="Klicken zum Bearbeiten"
                                >
                                  <RichTextDisplay content={subTask.description || ''} className="text-sm" />
                                </div>
                              </motion.div>
                              
                              {/* Zusammengeklappte Vorschau */}
                              {collapsedDescriptions.has(subTask.id) && (
                                <div 
                                  className="px-3 pb-2 cursor-pointer"
                                  onClick={() => toggleDescriptionCollapse(subTask.id)}
                                >
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {subTask.description?.replace(/<[^>]*>/g, '').slice(0, 60)}...
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Button zum Hinzufügen einer Beschreibung */}
                      {!subTask.description && expandedSubTaskId !== subTask.id && (
                        <button
                          onClick={() => {
                            setExpandedSubTaskId(subTask.id);
                            setEditingSubTaskDescription('');
                          }}
                          className="ml-10 mt-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Beschreibung hinzufügen
                        </button>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Neue Sub-Task hinzufügen */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  {!showSubTaskForm ? (
                    <Button
                      onClick={() => setShowSubTaskForm(true)}
                      variant="outline"
                      className="w-full min-h-[44px] border-dashed"
                    >
                      <Plus size={18} className="mr-2" />
                      Neue Sub-Task hinzufügen
                    </Button>
                  ) : (
                    <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <div>
                        <Label className="text-sm font-medium mb-1 block">Titel *</Label>
                        <Input
                          value={newSubTaskTitle}
                          onChange={(e) => setNewSubTaskTitle(e.target.value)}
                          placeholder="Sub-Task Titel..."
                          className="min-h-[44px] text-base"
                        />
                      </div>
                      
                      <div>
                        <Label className="text-sm font-medium mb-1 block">Beschreibung (optional)</Label>
                        <RichTextEditor
                          value={newSubTaskDescription}
                          onChange={setNewSubTaskDescription}
                          placeholder="Detaillierte Beschreibung..."
                          minHeight="100px"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Zuweisen an</Label>
                          <select
                            value={newSubTaskAssignee}
                            onChange={(e) => setNewSubTaskAssignee(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700 text-sm"
                          >
                            <option value="">Niemand</option>
                            {users.map((u) => {
                              const resource = resources.find(r => r.id === u.id);
                              return (
                                <option key={u.id} value={u.id}>
                                  {u.name || u.email} {resource ? `(${resource.freeHours}h frei)` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Geschätzte Stunden</Label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={newSubTaskHours}
                            onChange={(e) => setNewSubTaskHours(e.target.value)}
                            placeholder="z.B. 2.5"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Fälligkeitsdatum</Label>
                          <input
                            type="date"
                            value={newSubTaskDueDate}
                            onChange={(e) => setNewSubTaskDueDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <Button
                          onClick={() => {
                            setShowSubTaskForm(false);
                            setNewSubTaskTitle('');
                            setNewSubTaskDescription('');
                            setNewSubTaskDueDate('');
                            setNewSubTaskAssignee('');
                            setNewSubTaskHours('');
                          }}
                          variant="outline"
                          className="min-h-[44px]"
                        >
                          Abbrechen
                        </Button>
                        <Button 
                          onClick={handleAddSubTask} 
                          className="min-h-[44px]"
                          disabled={!newSubTaskTitle.trim()}
                        >
                          <Plus size={18} className="mr-1" />
                          Sub-Task erstellen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sitzungsnotizen */}
            <ProjectNotes
              ticketId={ticket.id}
              currentUserId={session?.user?.id || ''}
            />

            {/* Meilensteine Timeline */}
            <MilestoneTimeline
              ticketId={ticket.id}
              projectTitle={ticket.title}
              shareToken={ticket.shareToken}
              shareEnabled={ticket.shareEnabled}
            />
          </div>

          {/* Sidebar - Cards */}
          <div className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div>
                  <Label className="text-sm">Zugewiesen an</Label>
                  {isEditing ? (
                    <Select
                      value={formData.assignedToId}
                      onValueChange={(value) => setFormData({ ...formData, assignedToId: value })}
                    >
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Niemand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Niemand</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">
                      {ticket.assignedTo?.name || ticket.assignedTo?.email || 'Niemand'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    Team
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.teamId}
                      onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                    >
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Kein Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Team</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">{ticket.team?.name || 'Kein Team'}</p>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Teammitglieder können das Projekt sehen
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm flex items-center gap-1">
                    👤 Projektleiter/in
                  </Label>
                  {isEditing ? (
                    <Select
                      value={formData.projectManagerId}
                      onValueChange={(value) => setFormData({ ...formData, projectManagerId: value })}
                    >
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Kein Projektleiter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Kein Projektleiter</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">
                      {ticket.projectManager?.name || ticket.projectManager?.email || 'Kein Projektleiter'}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Erstellt von</Label>
                  <p className="mt-1 text-sm">{ticket.createdBy?.name || ticket.createdBy?.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Share Link */}
            {ticket.shareToken && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Share-Link</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status:</span>
                    <Badge variant={ticket.shareEnabled ? 'default' : 'secondary'}>
                      {ticket.shareEnabled ? 'Aktiv' : 'Deaktiviert'}
                    </Badge>
                  </div>
                  <Button
                    onClick={handleToggleShareEnabled}
                    variant="outline"
                    size="sm"
                    className="w-full min-h-[44px]"
                  >
                    {ticket.shareEnabled ? 'Deaktivieren' : 'Aktivieren'}
                  </Button>
                  {ticket.shareEnabled && (
                    <Button
                      onClick={() => {
                        const url = `${window.location.origin}/share/${ticket.shareToken}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Link kopiert!');
                      }}
                      variant="outline"
                      size="sm"
                      className="w-full min-h-[44px]"
                    >
                      <Copy size={14} className="mr-2" />
                      Link kopieren
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Share Dialog - Mobile optimized */}
        {showShareDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setShowShareDialog(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-t-2xl sm:rounded-xl w-full sm:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Share-Link erstellt</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Dieser Link kann öffentlich geteilt werden:
              </p>
              <div className="flex gap-2 mb-4">
                <Input value={shareUrl} readOnly className="flex-1 min-h-[44px] text-sm" />
                <Button onClick={handleCopyShareLink} size="sm" className="min-w-[44px] min-h-[44px]">
                  <Copy size={18} />
                </Button>
              </div>
              <Button onClick={() => setShowShareDialog(false)} className="w-full min-h-[48px]">
                Schließen
              </Button>
            </motion.div>
          </motion.div>
        )}

        {/* SubTask Detail Modal für Kanban */}
        {selectedKanbanSubTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setSelectedKanbanSubTask(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              className="bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header mit Titel und Status */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold">
                    {selectedKanbanSubTask.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedKanbanSubTask.completed 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : selectedKanbanSubTask.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedKanbanSubTask.completed ? 'Erledigt' : 
                       selectedKanbanSubTask.status === 'in_progress' ? 'In Bearbeitung' : 'Offen'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedKanbanSubTask(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Beschreibung */}
                {selectedKanbanSubTask.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                      <FileText size={14} />
                      Beschreibung
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                      <RichTextDisplay content={selectedKanbanSubTask.description} />
                    </div>
                  </div>
                )}

                {/* Zuweisung */}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                    <UserIcon size={14} />
                    Zugewiesen an
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {selectedKanbanSubTask.assignee ? (
                      <span className="font-medium">
                        {selectedKanbanSubTask.assignee.name || selectedKanbanSubTask.assignee.email}
                      </span>
                    ) : (
                      <span className="text-gray-400">Nicht zugewiesen</span>
                    )}
                  </div>
                </div>

                {/* Deadline */}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                    <Clock size={14} />
                    Fälligkeitsdatum
                  </label>
                  <div className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 ${
                    selectedKanbanSubTask.dueDate && 
                    new Date(selectedKanbanSubTask.dueDate) < new Date() && 
                    !selectedKanbanSubTask.completed 
                      ? 'text-red-600 dark:text-red-400' 
                      : ''
                  }`}>
                    {selectedKanbanSubTask.dueDate ? (
                      <span className="font-medium">
                        {new Date(selectedKanbanSubTask.dueDate).toLocaleDateString('de-DE', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400">Kein Datum gesetzt</span>
                    )}
                  </div>
                </div>

                {/* Geschätzte Stunden */}
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 mb-2">
                    <Clock size={14} />
                    Geschätzte Stunden
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    {selectedKanbanSubTask.estimatedHours ? (
                      <span className="font-medium">{selectedKanbanSubTask.estimatedHours} Stunden</span>
                    ) : (
                      <span className="text-gray-400">Keine Angabe</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Aktions-Buttons */}
              <div className="flex gap-2 mt-6">
                {/* Erinnerung senden */}
                {selectedKanbanSubTask.assigneeId && !selectedKanbanSubTask.completed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleSendReminder(selectedKanbanSubTask.id);
                    }}
                    disabled={sendingReminder === selectedKanbanSubTask.id || isBellBlocked(selectedKanbanSubTask.id)}
                    className="flex-1 min-h-[44px] gap-2"
                    title={isBellBlocked(selectedKanbanSubTask.id) ? `Noch ${getRemainingBlockTime(selectedKanbanSubTask.id)} Min warten` : 'Erinnerung senden'}
                  >
                    {sendingReminder === selectedKanbanSubTask.id ? (
                      <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                    ) : isBellBlocked(selectedKanbanSubTask.id) ? (
                      <BellOff size={16} className="text-gray-400" />
                    ) : (
                      <Bell size={16} className="text-orange-500" />
                    )}
                    <span className="hidden sm:inline">
                      {isBellBlocked(selectedKanbanSubTask.id) ? `${getRemainingBlockTime(selectedKanbanSubTask.id)} Min` : 'Erinnern'}
                    </span>
                  </Button>
                )}
                
                {/* Bearbeiten */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedKanbanSubTask(null);
                    setViewMode('list');
                    setEditingSubTaskId(selectedKanbanSubTask.id);
                    setEditingSubTaskTitle(selectedKanbanSubTask.title);
                  }}
                  className="flex-1 min-h-[44px] gap-2"
                >
                  <Edit2 size={16} className="text-blue-500" />
                  <span className="hidden sm:inline">Bearbeiten</span>
                </Button>
                
                {/* Löschen */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Sub-Task wirklich löschen?')) {
                      handleDeleteSubTask(selectedKanbanSubTask.id);
                      setSelectedKanbanSubTask(null);
                    }
                  }}
                  className="flex-1 min-h-[44px] gap-2 hover:bg-red-50 hover:border-red-300"
                >
                  <Trash2 size={16} className="text-red-500" />
                  <span className="hidden sm:inline">Löschen</span>
                </Button>
              </div>

              {/* Schließen Button */}
              <Button 
                onClick={() => setSelectedKanbanSubTask(null)} 
                className="w-full min-h-[48px] mt-3"
              >
                Schließen
              </Button>
            </motion.div>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
}
