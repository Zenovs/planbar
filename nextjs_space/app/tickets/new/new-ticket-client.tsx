'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, X, Users, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SimpleUser } from '@/lib/types';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Team {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  subTickets: { 
    id: string;
    title: string; 
    description: string | null;
    order: number;
  }[];
  team: {
    id: string;
    name: string;
  };
}

interface ResourceInfo {
  id: string;
  name: string;
  dailyHours: number;
  workDays: number;
  totalAvailableHours: number;
  assignedHours: number;
  freeHours: number;
  utilizationPercent: number;
}

interface SubTaskForm {
  title: string;
  dueDate?: string;
  assigneeId?: string;
  estimatedHours?: number;
}

interface NewTicketClientProps {
  users: SimpleUser[];
}

export function NewTicketClient({ users }: NewTicketClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    assignedToId: '',
    categoryId: '',
    teamId: '',
    subTasks: [] as SubTaskForm[],
  });
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState('');
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState('');
  const [newSubTaskHours, setNewSubTaskHours] = useState('');

  useEffect(() => {
    loadCategories();
    loadTemplates();
    loadTeams();
  }, []);

  useEffect(() => {
    // Lade Ressourcen wenn Sub-Task Deadline vorhanden
    if (newSubTaskDueDate) {
      loadResources(newSubTaskDueDate);
    }
  }, [newSubTaskDueDate, formData.subTasks.length]);

  async function loadResources(deadline: string) {
    try {
      const res = await fetch(`/api/resources?deadline=${deadline}`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
    }
  }

  function getDeadlineForResource(): string {
    return newSubTaskDueDate || '';
  }

  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  async function loadTemplates() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function loadTeams() {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Übernehme Template Sub-Tickets
    setFormData({
      ...formData,
      subTasks: template.subTickets.map(st => ({ title: st.title }))
    });

    toast.success(`Vorlage "${template.name}" geladen - ${template.subTickets.length} Sub-Tickets hinzugefügt`);
  }

  function addSubTask() {
    if (!newSubTaskTitle.trim()) return;
    const hours = parseFloat(newSubTaskHours);
    setFormData({
      ...formData,
      subTasks: [...formData.subTasks, { 
        title: newSubTaskTitle.trim(),
        dueDate: newSubTaskDueDate || undefined,
        assigneeId: newSubTaskAssignee || undefined,
        estimatedHours: !isNaN(hours) ? hours : undefined
      }]
    });
    setNewSubTaskTitle('');
    setNewSubTaskDueDate('');
    setNewSubTaskAssignee('');
    setNewSubTaskHours('');
  }

  function getResourceForUser(userId: string): ResourceInfo | undefined {
    return resources.find(r => r.id === userId);
  }

  function calculatePlannedHoursForUser(userId: string): number {
    return formData.subTasks
      .filter(st => st.assigneeId === userId)
      .reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
  }

  function getTotalPlannedHours(): number {
    return formData.subTasks.reduce((sum, st) => sum + (st.estimatedHours || 0), 0);
  }

  function checkFeasibility(): { feasible: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    for (const subTask of formData.subTasks) {
      if (subTask.assigneeId && subTask.estimatedHours) {
        const resource = getResourceForUser(subTask.assigneeId);
        if (resource) {
          const plannedHours = calculatePlannedHoursForUser(subTask.assigneeId);
          if (plannedHours > resource.freeHours) {
            const user = users.find(u => u.id === subTask.assigneeId);
            warnings.push(`${user?.name || 'Benutzer'}: ${plannedHours}h geplant, nur ${resource.freeHours}h verfügbar`);
          }
        }
      }
    }
    
    return { feasible: warnings.length === 0, warnings: [...new Set(warnings)] };
  }

  function removeSubTask(index: number) {
    setFormData({
      ...formData,
      subTasks: formData.subTasks.filter((_, i) => i !== index)
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || null,
          categoryId: formData.categoryId || null,
          teamId: formData.teamId || null,
          templateId: selectedTemplateId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Fehler beim Erstellen des Projekts');
        return;
      }

      toast.success('Projekt erfolgreich erstellt!');
      router.push(`/tickets/${data?.ticket?.id || ''}`);
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/tickets">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zu Projekts
          </motion.button>
        </Link>

        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Neues Projekt erstellen</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template-Auswahl */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔗 Vorlage auswählen (optional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Keine Vorlage</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Wähle eine Vorlage um Felder automatisch auszufüllen
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Kurze Beschreibung des Problems..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detaillierte Beschreibung des Projekts..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priorität
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategorie
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Keine Kategorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zugewiesen an
                </label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Nicht zugewiesen</option>
                  {users?.map((user) => (
                    <option key={user?.id} value={user?.id || ''}>
                      {user?.name || user?.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Team zuweisen
                </label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Kein Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Alle Teammitglieder können das Projekt sehen und bearbeiten
                </p>
              </div>
            </div>

            {/* Sub-Tasks mit Ressourcenplanung */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Sub-Tasks
                </label>
                {newSubTaskDueDate && resources.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowResourcePanel(!showResourcePanel)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                  >
                    <Users className="w-4 h-4" />
                    Ressourcen anzeigen
                  </button>
                )}
              </div>

              {/* Ressourcen-Panel - Modern Design */}
              {showResourcePanel && resources.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 mb-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" />
                      Kapazität bis {new Date(getDeadlineForResource()).toLocaleDateString('de-CH')}
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {resources.map(r => {
                      const plannedHours = calculatePlannedHoursForUser(r.id);
                      const effectiveFree = r.freeHours - plannedHours;
                      const overbooked = effectiveFree < 0;
                      const utilizationPercent = r.totalAvailableHours > 0 
                        ? Math.min(100, ((r.assignedHours + plannedHours) / r.totalAvailableHours) * 100) 
                        : 0;
                      return (
                        <div 
                          key={r.id} 
                          className={`relative overflow-hidden rounded-lg p-3 transition-all ${
                            overbooked 
                              ? 'bg-red-50 border-2 border-red-200' 
                              : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-800 text-sm">{r.name}</span>
                            {overbooked && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                            <div 
                              className={`h-full transition-all rounded-full ${
                                utilizationPercent > 100 ? 'bg-red-500' :
                                utilizationPercent > 80 ? 'bg-orange-500' :
                                utilizationPercent > 50 ? 'bg-yellow-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, utilizationPercent)}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">{r.dailyHours}h/Tag</span>
                            <span className={`font-semibold ${overbooked ? 'text-red-600' : 'text-emerald-600'}`}>
                              {effectiveFree.toFixed(1)}h frei
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Machbarkeits-Warnung */}
              {formData.subTasks.length > 0 && (() => {
                const { feasible, warnings } = checkFeasibility();
                if (!feasible) {
                  return (
                    <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 text-orange-700 font-medium text-sm mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        Kapazitätswarnung
                      </div>
                      {warnings.map((w, i) => (
                        <div key={i} className="text-xs text-orange-600">• {w}</div>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-4">
                {/* Neue Sub-Task Eingabe - Modern Card Design */}
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-4 border border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                    {/* Titel */}
                    <div className="lg:col-span-4">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Aufgabe</label>
                      <input
                        type="text"
                        value={newSubTaskTitle}
                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubTask())}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        placeholder="Neue Sub-Task..."
                      />
                    </div>
                    
                    {/* Zuweisen */}
                    <div className="lg:col-span-3">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Zuweisen an</label>
                      <select
                        value={newSubTaskAssignee}
                        onChange={(e) => setNewSubTaskAssignee(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm appearance-none cursor-pointer transition-all"
                      >
                        <option value="">Person wählen...</option>
                        {users.map(u => {
                          const res = getResourceForUser(u.id);
                          const freeHours = res ? res.freeHours - calculatePlannedHoursForUser(u.id) : 0;
                          return (
                            <option key={u.id} value={u.id}>
                              {u.name} {res ? `(${freeHours.toFixed(1)}h frei)` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    
                    {/* Stunden */}
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Stunden</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={newSubTaskHours}
                          onChange={(e) => setNewSubTaskHours(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm pr-8 transition-all"
                          placeholder="0"
                          min="0"
                          step="0.5"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">h</span>
                      </div>
                    </div>
                    
                    {/* Deadline */}
                    <div className="lg:col-span-2">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Deadline</label>
                      <input
                        type="date"
                        value={newSubTaskDueDate}
                        onChange={(e) => setNewSubTaskDueDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                      />
                    </div>
                    
                    {/* Button */}
                    <div className="lg:col-span-1 flex items-end">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={addSubTask}
                        className="w-full h-[42px] bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all flex items-center justify-center shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Sub-Tasks Liste - Modern Cards */}
                {formData.subTasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-sm font-medium text-slate-600">
                        {formData.subTasks.length} Sub-Task{formData.subTasks.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                        {getTotalPlannedHours()}h geplant
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {formData.subTasks.map((subTask, index) => {
                        const assignee = users.find(u => u.id === subTask.assigneeId);
                        return (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg hover:shadow-md hover:border-slate-300 transition-all"
                          >
                            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                              <span className="text-sm font-medium text-slate-800 truncate">{subTask.title}</span>
                              <div className="flex items-center gap-2 flex-wrap">
                                {assignee && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                                    <Users className="w-3 h-3" />
                                    {assignee.name}
                                  </span>
                                )}
                                {subTask.estimatedHours && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                                    <Clock className="w-3 h-3" />
                                    {subTask.estimatedHours}h
                                  </span>
                                )}
                                {subTask.dueDate && (
                                  <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                                    📅 {new Date(subTask.dueDate).toLocaleDateString('de-CH')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              type="button"
                              onClick={() => removeSubTask(index)}
                              className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {loading ? 'Erstelle...' : 'Projekt erstellen'}
              </motion.button>
              <Link href="/tickets">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Abbrechen
                </motion.button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
