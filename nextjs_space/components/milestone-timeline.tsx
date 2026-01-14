'use client';

import { useState, useEffect } from 'react';
import { format, differenceInDays, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  Plus,
  Flag,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  Share2,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  color: string;
  position: number;
}

interface MilestoneTimelineProps {
  ticketId: string;
  projectTitle: string;
  shareToken?: string | null;
  shareEnabled?: boolean;
  onShareUpdate?: (token: string, enabled: boolean) => void;
}

const colorOptions = [
  { value: 'green', label: 'Grün (Abgeschlossen)', bg: 'bg-green-500', border: 'border-green-500' },
  { value: 'red', label: 'Rot (Kritisch)', bg: 'bg-red-500', border: 'border-red-500' },
  { value: 'gray', label: 'Grau (Normal)', bg: 'bg-gray-500', border: 'border-gray-500' },
  { value: 'blue', label: 'Blau (In Arbeit)', bg: 'bg-blue-500', border: 'border-blue-500' },
  { value: 'yellow', label: 'Gelb (Warnung)', bg: 'bg-yellow-500', border: 'border-yellow-500' },
];

export function MilestoneTimeline({
  ticketId,
  projectTitle,
  shareToken,
  shareEnabled,
  onShareUpdate,
}: MilestoneTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [color, setColor] = useState('gray');
  const [submitting, setSubmitting] = useState(false);

  // Load milestones
  const loadMilestones = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/milestones?ticketId=${ticketId}`);
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setMilestones(data);
    } catch (error) {
      console.error('Fehler beim Laden der Meilensteine:', error);
      toast.error('Meilensteine konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
  }, [ticketId]);

  const handleCreate = async () => {
    if (!title.trim() || !dueDate) {
      toast.error('Titel und Datum sind erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          title: title.trim(),
          description: description.trim() || null,
          dueDate,
          color,
        }),
      });

      if (!res.ok) throw new Error('Fehler beim Erstellen');

      toast.success('Meilenstein erstellt');
      setIsAddDialogOpen(false);
      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Meilenstein konnte nicht erstellt werden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMilestone || !title.trim() || !dueDate) {
      toast.error('Titel und Datum sind erforderlich');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/milestones/${editingMilestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          dueDate,
          color,
        }),
      });

      if (!res.ok) throw new Error('Fehler beim Aktualisieren');

      toast.success('Meilenstein aktualisiert');
      setIsEditDialogOpen(false);
      resetForm();
      loadMilestones();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Meilenstein konnte nicht aktualisiert werden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Meilenstein wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/milestones/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen');

      toast.success('Meilenstein gelöscht');
      loadMilestones();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Meilenstein konnte nicht gelöscht werden');
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    try {
      const res = await fetch(`/api/milestones/${milestone.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: !milestone.completed,
          color: !milestone.completed ? 'green' : 'gray',
        }),
      });

      if (!res.ok) throw new Error('Fehler');
      loadMilestones();
    } catch (error) {
      console.error('Fehler:', error);
      toast.error('Status konnte nicht geändert werden');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setColor('gray');
    setEditingMilestone(null);
  };

  const openEditDialog = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setTitle(milestone.title);
    setDescription(milestone.description || '');
    setDueDate(format(new Date(milestone.dueDate), 'yyyy-MM-dd'));
    setColor(milestone.color);
    setIsEditDialogOpen(true);
  };

  const getShareUrl = () => {
    if (typeof window !== 'undefined' && shareToken) {
      return `${window.location.origin}/share/${shareToken}/timeline`;
    }
    return '';
  };

  const copyShareUrl = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url);
    toast.success('Link kopiert!');
  };

  const getColorClass = (colorValue: string) => {
    const colorOption = colorOptions.find(c => c.value === colorValue);
    return colorOption?.bg || 'bg-gray-500';
  };

  const getBorderClass = (colorValue: string) => {
    const colorOption = colorOptions.find(c => c.value === colorValue);
    return colorOption?.border || 'border-gray-500';
  };

  // Timeline calculation
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const getTimelinePosition = (milestone: Milestone) => {
    if (sortedMilestones.length <= 1) return 50;
    const index = sortedMilestones.findIndex(m => m.id === milestone.id);
    return (index / (sortedMilestones.length - 1)) * 100;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Flag className="w-5 h-5" />
          Meilensteine
        </CardTitle>
        <div className="flex items-center gap-2">
          {shareToken && shareEnabled && (
            <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Share2 className="w-4 h-4 mr-1" />
                  Teilen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Timeline teilen</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Teilen Sie die Meilenstein-Timeline mit Ihren Kunden:
                  </p>
                  <div className="flex gap-2">
                    <Input value={getShareUrl()} readOnly className="flex-1" />
                    <Button onClick={copyShareUrl}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(getShareUrl(), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Vorschau öffnen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Meilenstein
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neuer Meilenstein</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Titel *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Projektstart, Beta-Release..."
                  />
                </div>
                <div>
                  <Label>Fälligkeitsdatum *</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Farbe / Status</Label>
                  <Select value={color} onValueChange={setColor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${opt.bg}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optionale Details..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting}>
                    {submitting ? 'Speichern...' : 'Speichern'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Flag className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Keine Meilensteine
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Definieren Sie wichtige Meilensteine für Ihr Projekt, um den Fortschritt zu visualisieren.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline Visualization */}
            <div className="relative py-8">
              {/* Timeline Bar */}
              <div className="absolute left-0 right-0 top-1/2 h-3 bg-amber-700 rounded-full transform -translate-y-1/2" />
              
              {/* Week markers */}
              <div className="absolute left-0 right-0 top-1/2 transform -translate-y-1/2 flex justify-between px-2">
                {sortedMilestones.length > 0 && (
                  <>
                    {Array.from({ length: Math.min(sortedMilestones.length + 2, 10) }).map((_, i) => (
                      <div
                        key={i}
                        className="w-px h-3 bg-amber-900/50"
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Milestone markers */}
              <div className="relative h-32">
                {sortedMilestones.map((milestone, index) => {
                  const position = getTimelinePosition(milestone);
                  const isAbove = index % 2 === 0;
                  
                  return (
                    <div
                      key={milestone.id}
                      className="absolute transform -translate-x-1/2"
                      style={{
                        left: `${Math.max(5, Math.min(95, position))}%`,
                        top: isAbove ? '0' : '50%',
                      }}
                    >
                      {/* Marker and content */}
                      <div className={`flex flex-col items-center ${isAbove ? '' : 'flex-col-reverse'}`}>
                        {/* Content */}
                        <div className={`text-center max-w-[140px] ${isAbove ? 'mb-2' : 'mt-2'}`}>
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                            {milestone.title}
                          </p>
                          <p className={`text-xs ${getColorClass(milestone.color).replace('bg-', 'text-')}`}>
                            {format(new Date(milestone.dueDate), 'dd. MMM yyyy', { locale: de })}
                          </p>
                        </div>
                        
                        {/* Connector line */}
                        <div className={`w-0.5 h-4 ${getColorClass(milestone.color)}`} />
                        
                        {/* Triangle marker */}
                        <div
                          className={`w-0 h-0 cursor-pointer transition-transform hover:scale-110
                            ${isAbove 
                              ? 'border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent' 
                              : 'border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent'
                            }
                            ${isAbove 
                              ? getBorderClass(milestone.color).replace('border-', 'border-t-')
                              : getBorderClass(milestone.color).replace('border-', 'border-b-')
                            }
                          `}
                          onClick={() => openEditDialog(milestone)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestone List */}
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Alle Meilensteine</h4>
              {sortedMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-center justify-between p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-800 ${getBorderClass(milestone.color)}`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleComplete(milestone)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                        milestone.completed
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {milestone.completed && <Check className="w-3 h-3" />}
                    </button>
                    <div>
                      <p className={`font-medium ${milestone.completed ? 'line-through text-gray-500' : ''}`}>
                        {milestone.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(milestone.dueDate), 'dd. MMMM yyyy', { locale: de })}
                        {milestone.description && ` • ${milestone.description}`}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(milestone)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(milestone.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Löschen
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meilenstein bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titel *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Projektstart, Beta-Release..."
              />
            </div>
            <div>
              <Label>Fälligkeitsdatum *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Farbe / Status</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${opt.bg}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Details..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleUpdate} disabled={submitting}>
                {submitting ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
