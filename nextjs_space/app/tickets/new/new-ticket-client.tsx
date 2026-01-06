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
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    assignedToId: '',
    deadline: '',
    categoryId: '',
    subTasks: [] as SubTaskForm[],
  });
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newSubTaskDueDate, setNewSubTaskDueDate] = useState('');
  const [newSubTaskAssignee, setNewSubTaskAssignee] = useState('');
  const [newSubTaskHours, setNewSubTaskHours] = useState('');

  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

  useEffect(() => {
    // Lade Ressourcen wenn Sub-Task Deadline oder Ticket Deadline vorhanden
    const deadline = newSubTaskDueDate || formData.deadline;
    if (deadline) {
      loadResources(deadline);
    }
  }, [formData.deadline, newSubTaskDueDate]);

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
    return newSubTaskDueDate || formData.deadline || '';
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
          deadline: formData.deadline || null,
          categoryId: formData.categoryId || null,
          templateId: selectedTemplateId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Fehler beim Erstellen des Tickets');
        return;
      }

      toast.success('Ticket erfolgreich erstellt!');
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
            Zurück zu Tickets
          </motion.button>
        </Link>

        <div className="bg-white rounded-xl shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Neues Ticket erstellen</h1>

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
                placeholder="Detaillierte Beschreibung des Tickets..."
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
                  Deadline
                </label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sub-Tasks mit Ressourcenplanung */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Sub-Tasks
                </label>
                {(formData.deadline || newSubTaskDueDate) && resources.length > 0 && (
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

              {/* Ressourcen-Panel */}
              {showResourcePanel && resources.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">
                    Verfügbare Kapazität bis {new Date(getDeadlineForResource()).toLocaleDateString('de-CH')}
                    {newSubTaskDueDate && newSubTaskDueDate !== formData.deadline && (
                      <span className="text-xs text-blue-600 ml-2">(Sub-Task Deadline)</span>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {resources.map(r => {
                      const plannedHours = calculatePlannedHoursForUser(r.id);
                      const effectiveFree = r.freeHours - plannedHours;
                      const overbooked = effectiveFree < 0;
                      return (
                        <div key={r.id} className={`text-xs p-2 rounded ${overbooked ? 'bg-red-100' : 'bg-white'}`}>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-gray-600">
                            {r.dailyHours}h/Tag × {r.workDays} Tage = {r.totalAvailableHours}h
                          </div>
                          <div className={overbooked ? 'text-red-600 font-bold' : 'text-green-600'}>
                            Frei: {effectiveFree.toFixed(1)}h {overbooked && '⚠️'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Machbarkeits-Warnung */}
              {formData.deadline && formData.subTasks.length > 0 && (() => {
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

              <div className="space-y-2">
                {/* Neue Sub-Task Eingabe */}
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubTask())}
                    className="col-span-12 sm:col-span-4 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Sub-Task..."
                  />
                  <select
                    value={newSubTaskAssignee}
                    onChange={(e) => setNewSubTaskAssignee(e.target.value)}
                    className="col-span-6 sm:col-span-3 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Zuweisen...</option>
                    {users.map(u => {
                      const res = getResourceForUser(u.id);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} {res ? `(${res.freeHours}h frei)` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <input
                    type="number"
                    value={newSubTaskHours}
                    onChange={(e) => setNewSubTaskHours(e.target.value)}
                    className="col-span-3 sm:col-span-2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Std."
                    min="0"
                    step="0.5"
                  />
                  <input
                    type="date"
                    value={newSubTaskDueDate}
                    onChange={(e) => setNewSubTaskDueDate(e.target.value)}
                    className="col-span-3 sm:col-span-2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addSubTask}
                    className="col-span-12 sm:col-span-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Sub-Tasks Liste */}
                {formData.subTasks.length > 0 && (
                  <div className="space-y-1 mt-3">
                    <div className="text-xs text-gray-500 mb-1">
                      {formData.subTasks.length} Sub-Tasks • {getTotalPlannedHours()}h gesamt geplant
                    </div>
                    {formData.subTasks.map((subTask, index) => {
                      const assignee = users.find(u => u.id === subTask.assigneeId);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{subTask.title}</span>
                            {assignee && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                👤 {assignee.name}
                              </span>
                            )}
                            {subTask.estimatedHours && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                ⏱ {subTask.estimatedHours}h
                              </span>
                            )}
                            {subTask.dueDate && (
                              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                📅 {new Date(subTask.dueDate).toLocaleDateString('de-CH')}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeSubTask(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
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
                {loading ? 'Erstelle...' : 'Ticket erstellen'}
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
