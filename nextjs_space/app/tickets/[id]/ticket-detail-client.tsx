'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
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
  Users
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
import { ProjectTimeline } from '@/components/project-timeline';
import { ProjectNotes } from '@/components/project-notes';
import { MilestoneTimeline } from '@/components/milestone-timeline';

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
  completed: boolean;
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
  shareToken: string | null;
  shareEnabled: boolean;
  estimatedHours?: number | null;
  assignedTo?: User | null;
  createdBy?: User | null;
  team?: Team | null;
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
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState('');
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState('');
  const [newSubTaskHours, setNewSubTaskHours] = useState('');
  const [editingSubTaskId, setEditingSubTaskId] = useState<string | null>(null);
  const [editingSubTaskTitle, setEditingSubTaskTitle] = useState('');
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [showResourcePanel, setShowResourcePanel] = useState(false);

  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    assignedToId: ticket.assignedToId || 'none',
    teamId: ticket.teamId || 'none',
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
        setNewSubTaskDueDate('');
        setNewSubTaskAssignee('');
        setNewSubTaskHours('');
        toast.success('Sub-Task hinzugefügt');
        // Ressourcen neu laden, da eine neue Aufgabe zugewiesen wurde
        await loadResources();
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
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
    try {
      const res = await fetch(`/api/subtasks?id=${subTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (res.ok) {
        const updatedSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: (ticket.subTasks || []).map((st: SubTask) =>
            st.id === subTaskId ? updatedSubTask : st
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <Button onClick={() => router.push('/tickets')} variant="outline" size="sm" className="min-h-[44px] min-w-[44px] sm:min-w-0 px-2 sm:px-3">
              <ArrowLeft size={18} />
              <span className="hidden sm:inline ml-2">Zurück</span>
            </Button>
            <h1 className="text-xl sm:text-3xl font-bold">Projekt Details</h1>
          </div>
          
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResourcePanel(!showResourcePanel)}
                    className="gap-1"
                  >
                    <Users size={16} />
                    <span className="hidden sm:inline">Ressourcen</span>
                  </Button>
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
                {/* Ressourcen-Panel */}
                {showResourcePanel && resources.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Verfügbare Kapazität bis Deadline
                    </h4>
                    <div className="space-y-2">
                      {resources.map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-sm bg-white dark:bg-gray-800 p-2 rounded">
                          <span className="font-medium truncate">{r.name || r.email}</span>
                          <div className="flex items-center gap-3">
                            <span className={`${r.utilizationPercent > 80 ? 'text-red-600' : r.utilizationPercent > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                              {r.freeHours}h frei
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${r.utilizationPercent > 80 ? 'bg-red-500' : r.utilizationPercent > 50 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, r.utilizationPercent)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-12">{r.utilizationPercent}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(ticket.subTasks || []).map((subTask: SubTask) => {
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
                    </motion.div>
                  );
                })}
                
                {/* Neue Sub-Task hinzufügen */}
                <div className="border-t pt-4 mt-4 space-y-3">
                  <Input
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    placeholder="Neue Sub-Task..."
                    className="min-h-[44px] text-base"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubTask();
                      }
                    }}
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <select
                      value={newSubTaskAssignee}
                      onChange={(e) => setNewSubTaskAssignee(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700 text-sm"
                    >
                      <option value="">Zuweisen...</option>
                      {users.map((u) => {
                        const resource = resources.find(r => r.id === u.id);
                        return (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email} {resource ? `(${resource.freeHours}h frei)` : ''}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={newSubTaskHours}
                      onChange={(e) => setNewSubTaskHours(e.target.value)}
                      placeholder="Stunden"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700"
                    />
                    <input
                      type="date"
                      value={newSubTaskDueDate}
                      onChange={(e) => setNewSubTaskDueDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg min-h-[44px] bg-white dark:bg-gray-700"
                    />
                    <Button onClick={handleAddSubTask} className="min-h-[44px]">
                      <Plus size={18} className="mr-1" />
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projektzeitplan / Timeline */}
            <ProjectTimeline
              projectTitle={ticket.title}
              subTasks={ticket.subTasks || []}
            />

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
      </div>
    </div>
  );
}
