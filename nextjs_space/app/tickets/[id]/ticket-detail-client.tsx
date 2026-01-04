'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  MoreVertical
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

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  position: number;
}

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  deadline: Date | null;
  assignedToId: string | null;
  categoryId: string | null;
  shareToken: string | null;
  shareEnabled: boolean;
  assignedTo?: User | null;
  createdBy?: User | null;
  category?: Category | null;
  subTasks?: SubTask[];
}

interface TicketDetailClientProps {
  ticket: Ticket;
  users: User[];
  categories: Category[];
}

export function TicketDetailClient({ ticket: initialTicket, users, categories }: TicketDetailClientProps) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description || '',
    status: ticket.status,
    priority: ticket.priority,
    deadline: ticket.deadline ? new Date(ticket.deadline).toISOString().split('T')[0] : '',
    assignedToId: ticket.assignedToId || 'none',
    categoryId: ticket.categoryId || 'none',
  });

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
          deadline: formData.deadline || null,
          assignedToId: formData.assignedToId === 'none' ? null : formData.assignedToId,
          categoryId: formData.categoryId === 'none' ? null : formData.categoryId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
        setIsEditing(false);
        toast.success('Ticket aktualisiert');
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
    if (!confirm('Ticket wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Ticket gelöscht');
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
        }),
      });

      if (res.ok) {
        const newSubTask = await res.json();
        setTicket({
          ...ticket,
          subTasks: [...(ticket.subTasks || []), newSubTask],
        });
        setNewSubTaskTitle('');
        toast.success('Sub-Task hinzugefügt');
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen');
    }
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
          subTasks: (ticket.subTasks || []).map((st) =>
            st.id === subTaskId ? updatedSubTask : st
          ),
        });
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
          subTasks: (ticket.subTasks || []).filter((st) => st.id !== subTaskId),
        });
        toast.success('Sub-Task gelöscht');
        router.refresh();
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const progress = ticket.subTasks && ticket.subTasks.length > 0
    ? Math.round((ticket.subTasks.filter(st => st.completed).length / ticket.subTasks.length) * 100)
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
            <h1 className="text-xl sm:text-3xl font-bold">Ticket Details</h1>
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
            <Card>
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
                      {ticket.category && (
                        <Badge
                          style={{
                            backgroundColor: `${ticket.category.color}20`,
                            color: ticket.category.color,
                            borderColor: ticket.category.color,
                          }}
                          variant="outline"
                        >
                          {ticket.category.name}
                        </Badge>
                      )}
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
              </CardContent>
            </Card>

            {/* Sub-Tasks */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Sub-Tasks ({(ticket.subTasks || []).length})</CardTitle>
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
                {(ticket.subTasks || []).map((subTask) => (
                  <motion.div
                    key={subTask.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <button
                      onClick={() => handleToggleSubTask(subTask.id, subTask.completed)}
                      className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
                    >
                      {subTask.completed ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm sm:text-base ${
                        subTask.completed ? 'line-through text-gray-500' : ''
                      }`}
                    >
                      {subTask.title}
                    </span>
                    <Button
                      onClick={() => handleDeleteSubTask(subTask.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 min-w-[44px] min-h-[44px]"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </motion.div>
                ))}
                <div className="flex gap-2 mt-4">
                  <Input
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    placeholder="Neue Sub-Task..."
                    className="flex-1 min-h-[44px] text-base"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubTask();
                      }
                    }}
                  />
                  <Button onClick={handleAddSubTask} size="sm" className="min-w-[44px] min-h-[44px]">
                    <Plus size={18} />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                  <Label className="text-sm">Kategorie</Label>
                  {isEditing ? (
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                    >
                      <SelectTrigger className="mt-1 min-h-[44px]">
                        <SelectValue placeholder="Keine Kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine Kategorie</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color }}
                              />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-1 text-sm">{ticket.category?.name || 'Keine Kategorie'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm">Fälligkeitsdatum</Label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="mt-1 min-h-[44px]"
                    />
                  ) : (
                    <p className="mt-1 text-sm">
                      {ticket.deadline
                        ? new Date(ticket.deadline).toLocaleDateString('de-DE')
                        : 'Kein Datum'}
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
