'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  Link2,
  User,
  ArrowRight,
} from 'lucide-react';

interface MilestoneRef {
  id: string;
  title: string;
  dueDate: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  completed: boolean;
  color: string;
  position: number;
  responsibility: string | null;
  dependsOnId: string | null;
  dependsOn: MilestoneRef | null;
  dependents: MilestoneRef[];
}

// Vordefinierte Verantwortlichkeiten
const responsibilityOptions = [
  { value: 'none', label: 'Keine Angabe' },
  { value: 'Kunde', label: 'Kunde' },
  { value: 'Entwickler', label: 'Entwickler' },
  { value: 'Designer', label: 'Designer' },
  { value: 'Fotograf', label: 'Fotograf' },
  { value: 'Texter', label: 'Texter' },
  { value: 'Projektleiter', label: 'Projektleiter' },
  { value: 'Extern', label: 'Extern' },
];

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
  const [responsibility, setResponsibility] = useState('none');
  const [dependsOnId, setDependsOnId] = useState('none');
  const [cascadeShift, setCascadeShift] = useState(true);
  const [customResponsibility, setCustomResponsibility] = useState('');
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

    // Verwende entweder custom oder vordefinierte Verantwortung
    const finalResponsibility = customResponsibility.trim() || (responsibility === 'none' ? null : responsibility) || null;

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
          responsibility: finalResponsibility,
          dependsOnId: dependsOnId === 'none' ? null : dependsOnId,
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

    // Verwende entweder custom oder vordefinierte Verantwortung
    const finalResponsibility = customResponsibility.trim() || (responsibility === 'none' ? null : responsibility) || null;

    // Prüfe ob Datum sich geändert hat und Abhängige vorhanden sind
    const dateChanged = editingMilestone.dueDate.split('T')[0] !== dueDate;
    const hasDependents = editingMilestone.dependents && editingMilestone.dependents.length > 0;

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
          responsibility: finalResponsibility,
          dependsOnId: dependsOnId === 'none' ? null : dependsOnId,
          cascadeShift: cascadeShift && dateChanged && hasDependents,
        }),
      });

      if (!res.ok) throw new Error('Fehler beim Aktualisieren');

      const message = cascadeShift && dateChanged && hasDependents 
        ? 'Meilenstein und abhängige Meilensteine aktualisiert'
        : 'Meilenstein aktualisiert';
      toast.success(message);
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
    setResponsibility('none');
    setCustomResponsibility('');
    setDependsOnId('none');
    setCascadeShift(true);
    setEditingMilestone(null);
  };

  const openEditDialog = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setTitle(milestone.title);
    setDescription(milestone.description || '');
    setDueDate(format(new Date(milestone.dueDate), 'yyyy-MM-dd'));
    setColor(milestone.color);
    
    // Prüfe ob Verantwortlichkeit vordefiniert ist oder custom
    const predefinedResp = responsibilityOptions.find(r => r.value === milestone.responsibility);
    if (predefinedResp) {
      setResponsibility(milestone.responsibility || 'none');
      setCustomResponsibility('');
    } else {
      setResponsibility('none');
      setCustomResponsibility(milestone.responsibility || '');
    }
    
    setDependsOnId(milestone.dependsOnId || 'none');
    setCascadeShift(true);
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                
                {/* Verantwortlichkeit */}
                <div>
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Verantwortung
                  </Label>
                  <Select value={responsibility} onValueChange={(val) => {
                    setResponsibility(val);
                    if (val && val !== 'none') setCustomResponsibility('');
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen oder unten eingeben..." />
                    </SelectTrigger>
                    <SelectContent>
                      {responsibilityOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="mt-2"
                    value={customResponsibility}
                    onChange={(e) => {
                      setCustomResponsibility(e.target.value);
                      if (e.target.value) setResponsibility('none');
                    }}
                    placeholder="Oder eigene Verantwortung eingeben..."
                  />
                </div>

                {/* Abhängigkeit */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Abhängig von
                  </Label>
                  <Select value={dependsOnId} onValueChange={setDependsOnId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Kein Vorgänger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Vorgänger</SelectItem>
                      {milestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.title} ({format(new Date(m.dueDate), 'dd.MM.yyyy')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Wenn sich der Vorgänger verschiebt, verschiebt sich dieser Meilenstein ebenfalls.
                  </p>
                </div>

                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optionale Details..."
                    rows={2}
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
            <div className="relative py-12 px-4">
              {/* Timeline Bar */}
              <div className="absolute left-4 right-4 top-1/2 h-2 bg-amber-600/80 rounded-full transform -translate-y-1/2 shadow-sm" />
              
              {/* Dependency Lines - SVG overlay */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
                {sortedMilestones.map((milestone) => {
                  if (!milestone.dependsOnId) return null;
                  
                  const parentMilestone = sortedMilestones.find(m => m.id === milestone.dependsOnId);
                  if (!parentMilestone) return null;
                  
                  const parentPos = getTimelinePosition(parentMilestone);
                  const childPos = getTimelinePosition(milestone);
                  const parentIdx = sortedMilestones.findIndex(m => m.id === parentMilestone.id);
                  const childIdx = sortedMilestones.findIndex(m => m.id === milestone.id);
                  const parentIsAbove = parentIdx % 2 === 0;
                  const childIsAbove = childIdx % 2 === 0;
                  
                  // Calculate positions
                  const x1 = `${Math.max(8, Math.min(92, parentPos))}%`;
                  const x2 = `${Math.max(8, Math.min(92, childPos))}%`;
                  const y1 = parentIsAbove ? '40%' : '60%';
                  const y2 = childIsAbove ? '40%' : '60%';
                  
                  return (
                    <g key={`dep-${milestone.id}`}>
                      {/* Curved connection line */}
                      <path
                        d={`M ${x1} ${y1} Q ${x1} 50%, ${x2} 50% Q ${x2} 50%, ${x2} ${y2}`}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity="0.6"
                        markerEnd="url(#arrowhead)"
                      />
                    </g>
                  );
                })}
                {/* Arrow marker definition */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 6 3, 0 6" fill="#3b82f6" opacity="0.6" />
                  </marker>
                </defs>
              </svg>
              
              {/* Milestone markers - positioned ON the bar */}
              <div className="relative" style={{ minHeight: '120px', zIndex: 10 }}>
                {sortedMilestones.map((milestone, index) => {
                  const position = getTimelinePosition(milestone);
                  const isAbove = index % 2 === 0;
                  const hasDependency = !!milestone.dependsOnId;
                  const hasDependents = milestone.dependents && milestone.dependents.length > 0;
                  
                  return (
                    <div
                      key={milestone.id}
                      className="absolute transform -translate-x-1/2"
                      style={{
                        left: `${Math.max(8, Math.min(92, position))}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* Circle marker ON the bar */}
                      <div
                        className={`w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-125 shadow-md border-2 ${
                          hasDependency || hasDependents ? 'border-blue-400' : 'border-white'
                        } ${getColorClass(milestone.color)}`}
                        onClick={() => openEditDialog(milestone)}
                        title={hasDependency ? `Abhängig von: ${milestone.dependsOn?.title}` : undefined}
                      />
                      
                      {/* Label above or below */}
                      <div 
                        className={`absolute left-1/2 transform -translate-x-1/2 text-center max-w-[120px] ${
                          isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                      >
                        <p className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight">
                          {milestone.title}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-gray-500">
                          {format(new Date(milestone.dueDate), 'dd. MMM', { locale: de })}
                        </p>
                        {milestone.responsibility && (
                          <p className="text-[8px] sm:text-[9px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                            {milestone.responsibility}
                          </p>
                        )}
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
                  className={`p-3 rounded-lg border-l-4 bg-gray-50 dark:bg-gray-800 ${getBorderClass(milestone.color)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleComplete(milestone)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          milestone.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {milestone.completed && <Check className="w-3 h-3" />}
                      </button>
                      <div className="min-w-0">
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
                  
                  {/* Verantwortung & Abhängigkeit Badges */}
                  <div className="flex flex-wrap gap-2 mt-2 ml-8">
                    {milestone.responsibility && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        <User className="w-3 h-3" />
                        {milestone.responsibility}
                      </span>
                    )}
                    {milestone.dependsOn && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <Link2 className="w-3 h-3" />
                        Abhängig von: {milestone.dependsOn.title}
                      </span>
                    )}
                    {milestone.dependents && milestone.dependents.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                        <ArrowRight className="w-3 h-3" />
                        {milestone.dependents.length} abhängige{milestone.dependents.length > 1 ? '' : 'r'} Meilenstein{milestone.dependents.length > 1 ? 'e' : ''}
                      </span>
                    )}
                  </div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              {/* Cascade Shift Option */}
              {editingMilestone?.dependents && editingMilestone.dependents.length > 0 && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Checkbox
                    id="cascadeShift"
                    checked={cascadeShift}
                    onCheckedChange={(checked) => setCascadeShift(checked === true)}
                  />
                  <label htmlFor="cascadeShift" className="text-xs text-orange-700 dark:text-orange-300 cursor-pointer">
                    Abhängige Meilensteine ({editingMilestone.dependents.length}) automatisch verschieben
                  </label>
                </div>
              )}
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

            {/* Verantwortlichkeit */}
            <div>
              <Label className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Verantwortung
              </Label>
              <Select value={responsibility} onValueChange={(val) => {
                setResponsibility(val);
                if (val && val !== 'none') setCustomResponsibility('');
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Wählen oder unten eingeben..." />
                </SelectTrigger>
                <SelectContent>
                  {responsibilityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-2"
                value={customResponsibility}
                onChange={(e) => {
                  setCustomResponsibility(e.target.value);
                  if (e.target.value) setResponsibility('none');
                }}
                placeholder="Oder eigene Verantwortung eingeben..."
              />
            </div>

            {/* Abhängigkeit */}
            <div>
              <Label className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Abhängig von
              </Label>
              <Select value={dependsOnId} onValueChange={setDependsOnId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kein Vorgänger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Vorgänger</SelectItem>
                  {milestones
                    .filter(m => m.id !== editingMilestone?.id) // Kann nicht von sich selbst abhängen
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title} ({format(new Date(m.dueDate), 'dd.MM.yyyy')})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Wenn sich der Vorgänger verschiebt, verschiebt sich dieser Meilenstein ebenfalls.
              </p>
            </div>

            <div>
              <Label>Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optionale Details..."
                rows={2}
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
