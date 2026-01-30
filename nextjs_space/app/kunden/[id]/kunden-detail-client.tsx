'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  UserCircle,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  FolderOpen,
  Calendar,
  Users,
  ExternalLink,
  Link2,
  Copy,
  Check,
  X,
  Loader2,
  Share2,
  Clock,
  ArrowRight,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, isSameMonth, addMonths, subMonths } from 'date-fns';
import { de } from 'date-fns/locale';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Team {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  isExternal: boolean;
  position: number;
  color: string;
  levelId: string;
  teamId: string | null;
  ticketId: string | null;
  dependsOnId: string | null;
  team: Team | null;
  level: { id: string; name: string; color: string };
  ticket: { id: string; title: string; status: string } | null;
  dependsOn: { id: string; name: string } | null;
  dependents: { id: string; name: string }[];
}

interface Level {
  id: string;
  name: string;
  description: string | null;
  position: number;
  color: string;
  projects: Project[];
}

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  contactPerson: string | null;
  color: string;
  isActive: boolean;
  shareToken: string | null;
  shareEnabled: boolean;
  organization: { id: string; name: string };
  levels: Level[];
  projects: Project[];
}

const PROJECT_STATUS = [
  { value: 'planned', label: 'Geplant', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Arbeit', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Abgeschlossen', color: 'bg-green-500' },
  { value: 'on_hold', label: 'Pausiert', color: 'bg-orange-500' },
];

export default function KundenDetailClient({ customerId }: { customerId: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  // Modals
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  // Form states
  const [levelForm, setLevelForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    levelId: '',
    teamId: '',
    isExternal: false,
    startDate: '',
    endDate: '',
    color: '#10b981',
    dependsOnId: '',
    status: 'planned',
  });

  // Timeline state
  const [timelineMonth, setTimelineMonth] = useState(new Date());

  useEffect(() => {
    loadCustomer();
    loadTeams();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${customerId}`);
      const data = await res.json();
      if (res.ok) {
        setCustomer(data.customer);
        // Expand all levels by default
        setExpandedLevels(new Set(data.customer.levels.map((l: Level) => l.id)));
      } else {
        toast.error(data.error || 'Kunde nicht gefunden');
        router.push('/kunden');
      }
    } catch (error) {
      console.error('Error loading customer:', error);
      router.push('/kunden');
    } finally {
      setLoading(false);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  // Level functions
  const handleCreateLevel = async () => {
    if (!levelForm.name) {
      toast.error('Name ist erforderlich');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(levelForm),
      });

      if (res.ok) {
        toast.success('Level erstellt');
        setShowLevelModal(false);
        setLevelForm({ name: '', description: '', color: '#6366f1' });
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateLevel = async () => {
    if (!editingLevel || !levelForm.name) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/levels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ levelId: editingLevel.id, ...levelForm }),
      });

      if (res.ok) {
        toast.success('Level aktualisiert');
        setShowLevelModal(false);
        setEditingLevel(null);
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    if (!confirm('Level wirklich löschen? Alle zugehörigen Projekte werden ebenfalls gelöscht.')) return;

    try {
      const res = await fetch(`/api/customers/${customerId}/levels?levelId=${levelId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Level gelöscht');
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Project functions
  const handleCreateProject = async () => {
    if (!projectForm.name || !projectForm.levelId) {
      toast.error('Name und Level sind erforderlich');
      return;
    }

    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm),
      });

      if (res.ok) {
        toast.success('Projekt erstellt');
        setShowProjectModal(false);
        resetProjectForm();
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject || !projectForm.name) return;

    setProcessing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/projects`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: editingProject.id, ...projectForm }),
      });

      if (res.ok) {
        toast.success('Projekt aktualisiert');
        setShowProjectModal(false);
        setEditingProject(null);
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Projekt wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/customers/${customerId}/projects?projectId=${projectId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Projekt gelöscht');
        loadCustomer();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const resetProjectForm = () => {
    setProjectForm({
      name: '',
      description: '',
      levelId: selectedLevelId,
      teamId: '',
      isExternal: false,
      startDate: '',
      endDate: '',
      color: '#10b981',
      dependsOnId: '',
      status: 'planned',
    });
  };

  const openLevelModal = (level?: Level) => {
    if (level) {
      setEditingLevel(level);
      setLevelForm({ name: level.name, description: level.description || '', color: level.color });
    } else {
      setEditingLevel(null);
      setLevelForm({ name: '', description: '', color: '#6366f1' });
    }
    setShowLevelModal(true);
  };

  const openProjectModal = (levelId: string, project?: Project) => {
    setSelectedLevelId(levelId);
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        description: project.description || '',
        levelId: project.levelId,
        teamId: project.teamId || '',
        isExternal: project.isExternal,
        startDate: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
        endDate: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : '',
        color: project.color,
        dependsOnId: project.dependsOnId || '',
        status: project.status,
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        description: '',
        levelId,
        teamId: '',
        isExternal: false,
        startDate: '',
        endDate: '',
        color: '#10b981',
        dependsOnId: '',
        status: 'planned',
      });
    }
    setShowProjectModal(true);
  };

  // Share functions
  const toggleShare = async () => {
    if (!customer) return;

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareEnabled: !customer.shareEnabled }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomer({ ...customer, shareEnabled: data.customer.shareEnabled, shareToken: data.customer.shareToken });
        toast.success(data.customer.shareEnabled ? 'Teilen aktiviert' : 'Teilen deaktiviert');
      }
    } catch (error) {
      toast.error('Fehler');
    }
  };

  const copyShareLink = () => {
    if (!customer?.shareToken) return;
    const link = `${window.location.origin}/kunden/share/${customer.shareToken}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link kopiert!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Timeline calculation
  const timelineDays = useMemo(() => {
    const start = startOfMonth(timelineMonth);
    const end = endOfMonth(timelineMonth);
    return eachDayOfInterval({ start, end });
  }, [timelineMonth]);

  const getProjectPosition = (project: Project) => {
    if (!project.startDate || !project.endDate) return null;
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const monthStart = startOfMonth(timelineMonth);
    const monthEnd = endOfMonth(timelineMonth);

    // Check if project is visible in this month
    if (end < monthStart || start > monthEnd) return null;

    const visibleStart = start < monthStart ? monthStart : start;
    const visibleEnd = end > monthEnd ? monthEnd : end;

    const startDay = differenceInDays(visibleStart, monthStart);
    const duration = differenceInDays(visibleEnd, visibleStart) + 1;

    return {
      left: `${(startDay / timelineDays.length) * 100}%`,
      width: `${(duration / timelineDays.length) * 100}%`,
    };
  };

  const getStatusInfo = (status: string) => {
    return PROJECT_STATUS.find(s => s.value === status) || PROJECT_STATUS[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!customer) return null;

  // Get all projects for dependency selection
  const allProjects = customer.projects;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back button & Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/kunden')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück zu Kunden
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: customer.color }}
              >
                {customer.name[0].toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{customer.name}</h1>
                <p className="text-gray-500">{customer.organization.name}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {customer.contactPerson && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <UserCircle className="w-4 h-4" /> {customer.contactPerson}
                    </span>
                  )}
                  {customer.email && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <Mail className="w-4 h-4" /> {customer.email}
                    </span>
                  )}
                  {customer.phone && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="w-4 h-4" /> {customer.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowShareModal(true)}>
                <Share2 className="w-4 h-4 mr-2" />
                Teilen
              </Button>
              <Button onClick={() => openLevelModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Neues Level
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Übersicht
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Zeitplanung
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Layers className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.levels.length}</p>
                    <p className="text-xs text-gray-500">Levels</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.projects.length}</p>
                    <p className="text-xs text-gray-500">Projekte</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.projects.filter(p => !p.isExternal).length}</p>
                    <p className="text-xs text-gray-500">Intern</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <ExternalLink className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{customer.projects.filter(p => p.isExternal).length}</p>
                    <p className="text-xs text-gray-500">Extern</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Levels */}
            {customer.levels.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Noch keine Levels vorhanden</p>
                  <Button onClick={() => openLevelModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Erstes Level erstellen
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {customer.levels.map((level) => (
                  <Card key={level.id}>
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => {
                        const newExpanded = new Set(expandedLevels);
                        if (newExpanded.has(level.id)) {
                          newExpanded.delete(level.id);
                        } else {
                          newExpanded.add(level.id);
                        }
                        setExpandedLevels(newExpanded);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-8 rounded"
                            style={{ backgroundColor: level.color }}
                          />
                          <div>
                            <CardTitle className="text-lg">{level.name}</CardTitle>
                            {level.description && (
                              <p className="text-sm text-gray-500">{level.description}</p>
                            )}
                          </div>
                          <Badge variant="secondary">{level.projects.length} Projekte</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openProjectModal(level.id); }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); openLevelModal(level); }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteLevel(level.id); }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          {expandedLevels.has(level.id) ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <AnimatePresence>
                      {expandedLevels.has(level.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <CardContent className="pt-0">
                            {level.projects.length === 0 ? (
                              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                                <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">Noch keine Projekte</p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mt-2"
                                  onClick={() => openProjectModal(level.id)}
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Projekt hinzufügen
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {level.projects.map((project) => {
                                  const statusInfo = getStatusInfo(project.status);
                                  return (
                                    <div
                                      key={project.id}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div 
                                          className="w-2 h-8 rounded"
                                          style={{ backgroundColor: project.color }}
                                        />
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{project.name}</span>
                                            <Badge className={`${statusInfo.color} text-white text-xs`}>
                                              {statusInfo.label}
                                            </Badge>
                                            {project.isExternal ? (
                                              <Badge variant="outline" className="text-xs">
                                                <ExternalLink className="w-3 h-3 mr-1" />
                                                Extern
                                              </Badge>
                                            ) : project.team && (
                                              <Badge 
                                                variant="outline" 
                                                className="text-xs"
                                                style={{ borderColor: project.team.color, color: project.team.color }}
                                              >
                                                <Users className="w-3 h-3 mr-1" />
                                                {project.team.name}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                            {project.startDate && project.endDate && (
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {format(new Date(project.startDate), 'dd.MM.yy')} - {format(new Date(project.endDate), 'dd.MM.yy')}
                                              </span>
                                            )}
                                            {project.dependsOn && (
                                              <span className="flex items-center gap-1">
                                                <ArrowRight className="w-3 h-3" />
                                                Abhängig von: {project.dependsOn.name}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {project.ticket && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => router.push(`/tickets/${project.ticket!.id}`)}
                                          >
                                            <ExternalLink className="w-4 h-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openProjectModal(level.id, project)}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteProject(project.id)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Zeitplanung</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(subMonths(timelineMonth, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-32 text-center">
                      {format(timelineMonth, 'MMMM yyyy', { locale: de })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(addMonths(timelineMonth, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(new Date())}
                    >
                      Heute
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customer.projects.filter(p => p.startDate && p.endDate).length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Keine Projekte mit Zeitplanung</p>
                    <p className="text-sm text-gray-400">Fügen Sie Start- und Enddatum zu Projekten hinzu</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    {/* Timeline Header */}
                    <div className="min-w-[800px]">
                      <div className="flex border-b">
                        <div className="w-48 flex-shrink-0 p-2 font-medium text-sm">Projekt</div>
                        <div className="flex-1 flex">
                          {timelineDays.map((day, i) => (
                            <div
                              key={i}
                              className={`flex-1 text-center text-xs p-1 border-l ${
                                isWeekend(day) ? 'bg-gray-100' : ''
                              }`}
                            >
                              <div className="font-medium">{format(day, 'd')}</div>
                              <div className="text-gray-400">{format(day, 'EEE', { locale: de })}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline Rows by Level */}
                      {customer.levels.map((level) => (
                        <div key={level.id}>
                          {/* Level Header */}
                          <div className="flex bg-gray-50 border-b">
                            <div className="w-48 flex-shrink-0 p-2 font-medium text-sm flex items-center gap-2">
                              <div 
                                className="w-2 h-4 rounded"
                                style={{ backgroundColor: level.color }}
                              />
                              {level.name}
                            </div>
                            <div className="flex-1" />
                          </div>

                          {/* Projects */}
                          {level.projects.filter(p => p.startDate && p.endDate).map((project) => {
                            const position = getProjectPosition(project);
                            const statusInfo = getStatusInfo(project.status);
                            
                            return (
                              <div key={project.id} className="flex border-b hover:bg-gray-50">
                                <div className="w-48 flex-shrink-0 p-2 text-sm truncate flex items-center gap-2">
                                  {project.isExternal ? (
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  ) : (
                                    <Users className="w-3 h-3 text-gray-400" />
                                  )}
                                  {project.name}
                                </div>
                                <div className="flex-1 relative h-10">
                                  {/* Grid lines */}
                                  <div className="absolute inset-0 flex">
                                    {timelineDays.map((day, i) => (
                                      <div
                                        key={i}
                                        className={`flex-1 border-l ${
                                          isWeekend(day) ? 'bg-gray-50' : ''
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {/* Project bar */}
                                  {position && (
                                    <div
                                      className="absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80"
                                      style={{
                                        left: position.left,
                                        width: position.width,
                                        backgroundColor: project.color,
                                      }}
                                      onClick={() => openProjectModal(level.id, project)}
                                      title={`${project.name}\n${format(new Date(project.startDate!), 'dd.MM.yyyy')} - ${format(new Date(project.endDate!), 'dd.MM.yyyy')}`}
                                    >
                                      <div className="px-2 py-1 text-xs text-white truncate">
                                        {project.name}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Level Modal */}
      <Dialog open={showLevelModal} onOpenChange={setShowLevelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLevel ? 'Level bearbeiten' : 'Neues Level erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={levelForm.name}
                onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                placeholder="z.B. Phase 1"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={levelForm.description}
                onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Farbe</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={levelForm.color}
                  onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={levelForm.color}
                  onChange={(e) => setLevelForm({ ...levelForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLevelModal(false)}>Abbrechen</Button>
            <Button onClick={editingLevel ? handleUpdateLevel : handleCreateLevel} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingLevel ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Projekt bearbeiten' : 'Neues Projekt erstellen'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Name *</Label>
              <Input
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                placeholder="Projektname"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Level</Label>
              <Select 
                value={projectForm.levelId} 
                onValueChange={(v) => setProjectForm({ ...projectForm, levelId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Level auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {customer.levels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select 
                value={projectForm.status} 
                onValueChange={(v) => setProjectForm({ ...projectForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Extern vergeben</Label>
                <p className="text-xs text-gray-500">Projekt wird nicht intern bearbeitet</p>
              </div>
              <Switch
                checked={projectForm.isExternal}
                onCheckedChange={(checked) => setProjectForm({ ...projectForm, isExternal: checked, teamId: '' })}
              />
            </div>
            {!projectForm.isExternal && (
              <div>
                <Label>Team</Label>
                <Select 
                  value={projectForm.teamId} 
                  onValueChange={(v) => setProjectForm({ ...projectForm, teamId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Team auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Kein Team</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Startdatum</Label>
                <Input
                  type="date"
                  value={projectForm.startDate}
                  onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Enddatum</Label>
                <Input
                  type="date"
                  value={projectForm.endDate}
                  onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Abhängig von</Label>
              <Select 
                value={projectForm.dependsOnId} 
                onValueChange={(v) => setProjectForm({ ...projectForm, dependsOnId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine Abhängigkeit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Keine Abhängigkeit</SelectItem>
                  {allProjects
                    .filter(p => p.id !== editingProject?.id)
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.level.name} - {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Farbe</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={projectForm.color}
                  onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                  className="w-12 h-10 p-1"
                />
                <Input
                  value={projectForm.color}
                  onChange={(e) => setProjectForm({ ...projectForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProjectModal(false)}>Abbrechen</Button>
            <Button onClick={editingProject ? handleUpdateProject : handleCreateProject} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingProject ? 'Speichern' : 'Erstellen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zeitplanung teilen</DialogTitle>
            <DialogDescription>
              Teilen Sie die Zeitplanung mit Ihrem Kunden
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-sm font-medium">Teilen aktivieren</Label>
                <p className="text-xs text-gray-500">Generiert einen öffentlichen Link</p>
              </div>
              <Switch
                checked={customer.shareEnabled}
                onCheckedChange={toggleShare}
              />
            </div>
            {customer.shareEnabled && customer.shareToken && (
              <div>
                <Label>Share-Link</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/kunden/share/${customer.shareToken}`}
                    readOnly
                    className="text-sm"
                  />
                  <Button onClick={copyShareLink} variant="outline">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareModal(false)}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
