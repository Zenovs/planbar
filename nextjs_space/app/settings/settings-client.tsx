'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit2, Save, X, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  _count?: {
    tickets: number;
  };
}

interface Template {
  id: string;
  name: string;
  title: string;
  content: string;
  status: string;
  priority: string;
  categoryId: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
  subTasks: {
    id: string;
    title: string;
    position: number;
  }[];
}

const COLORS = [
  { name: 'Rot', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Gelb', value: '#eab308' },
  { name: 'Grün', value: '#22c55e' },
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Lila', value: '#a855f7' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Grau', value: '#6b7280' },
];

const STATUS_OPTIONS = [
  { label: 'Offen', value: 'open' },
  { label: 'In Bearbeitung', value: 'in_progress' },
  { label: 'Erledigt', value: 'done' },
];

const PRIORITY_OPTIONS = [
  { label: 'Niedrig', value: 'low' },
  { label: 'Mittel', value: 'medium' },
  { label: 'Hoch', value: 'high' },
];

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<'categories' | 'templates'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Category form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: COLORS[0].value,
    description: '',
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    content: '',
    status: 'open',
    priority: 'medium',
    categoryId: '',
    subTasks: [] as { title: string }[],
  });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'categories') {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } else {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data);
        }

        // Also load categories for template creation
        const catRes = await fetch('/api/categories');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Bitte Name eingeben');
      return;
    }

    try {
      const url = editingCategoryId
        ? `/api/categories?id=${editingCategoryId}`
        : '/api/categories';
      const method = editingCategoryId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        toast.success(
          editingCategoryId ? 'Kategorie aktualisiert' : 'Kategorie erstellt'
        );
        setCategoryForm({ name: '', color: COLORS[0].value, description: '' });
        setEditingCategoryId(null);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEditCategory = (cat: Category) => {
    setCategoryForm({
      name: cat.name,
      color: cat.color,
      description: cat.description || '',
    });
    setEditingCategoryId(cat.id);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Kategorie wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Kategorie gelöscht');
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Template functions
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim() || !templateForm.title.trim()) {
      toast.error('Bitte Name und Titel eingeben');
      return;
    }

    try {
      const url = editingTemplateId
        ? `/api/templates?id=${editingTemplateId}`
        : '/api/templates';
      const method = editingTemplateId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm),
      });

      if (res.ok) {
        toast.success(
          editingTemplateId ? 'Vorlage aktualisiert' : 'Vorlage erstellt'
        );
        setTemplateForm({
          name: '',
          title: '',
          content: '',
          status: 'open',
          priority: 'medium',
          categoryId: '',
          subTasks: [],
        });
        setEditingTemplateId(null);
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleEditTemplate = (tpl: Template) => {
    setTemplateForm({
      name: tpl.name,
      title: tpl.title,
      content: tpl.content,
      status: tpl.status,
      priority: tpl.priority,
      categoryId: tpl.categoryId || '',
      subTasks: tpl.subTasks.map((st) => ({ title: st.title })),
    });
    setEditingTemplateId(tpl.id);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Vorlage wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Vorlage gelöscht');
        loadData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleAddSubTask = () => {
    if (!newSubTaskTitle.trim()) return;
    setTemplateForm({
      ...templateForm,
      subTasks: [...templateForm.subTasks, { title: newSubTaskTitle }],
    });
    setNewSubTaskTitle('');
  };

  const handleRemoveSubTask = (index: number) => {
    setTemplateForm({
      ...templateForm,
      subTasks: templateForm.subTasks.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Einstellungen
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Kategorien und Vorlagen verwalten
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={() => setActiveTab('categories')}
            variant={activeTab === 'categories' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Tag size={16} />
            Kategorien
          </Button>
          <Button
            onClick={() => setActiveTab('templates')}
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <FileText size={16} />
            Vorlagen
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Category Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingCategoryId
                        ? 'Kategorie bearbeiten'
                        : 'Neue Kategorie'}
                    </CardTitle>
                    <CardDescription>
                      Erstelle Kategorien um Tickets zu organisieren
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, name: e.target.value })
                        }
                        placeholder="z.B. Bug, Feature, Support"
                      />
                    </div>
                    <div>
                      <Label>Farbe *</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.value}
                            onClick={() =>
                              setCategoryForm({ ...categoryForm, color: color.value })
                            }
                            className={`h-10 rounded-lg border-2 transition-all ${
                              categoryForm.color === color.value
                                ? 'border-blue-600 scale-110'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={categoryForm.description}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="Optionale Beschreibung"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCategory} className="flex-1">
                        <Save size={16} className="mr-2" />
                        {editingCategoryId ? 'Aktualisieren' : 'Erstellen'}
                      </Button>
                      {editingCategoryId && (
                        <Button
                          onClick={() => {
                            setCategoryForm({
                              name: '',
                              color: COLORS[0].value,
                              description: '',
                            });
                            setEditingCategoryId(null);
                          }}
                          variant="outline"
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Category List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vorhandene Kategorien</CardTitle>
                    <CardDescription>
                      {categories.length} Kategorie(n)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <motion.div
                          key={cat.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{cat.name}</div>
                              {cat.description && (
                                <div className="text-sm text-gray-500">
                                  {cat.description}
                                </div>
                              )}
                              {cat._count && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {cat._count.tickets} Ticket(s)
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditCategory(cat)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              onClick={() => handleDeleteCategory(cat.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                      {categories.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          Noch keine Kategorien vorhanden
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Template Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingTemplateId ? 'Vorlage bearbeiten' : 'Neue Vorlage'}
                    </CardTitle>
                    <CardDescription>
                      Erstelle Vorlagen mit vordefinierten Subtasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Vorlagenname *</Label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, name: e.target.value })
                        }
                        placeholder="z.B. Bug-Report, Feature-Request"
                      />
                    </div>
                    <div>
                      <Label>Ticket-Titel *</Label>
                      <Input
                        value={templateForm.title}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, title: e.target.value })
                        }
                        placeholder="Standard-Titel für Tickets"
                      />
                    </div>
                    <div>
                      <Label>Beschreibung</Label>
                      <Textarea
                        value={templateForm.content}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, content: e.target.value })
                        }
                        placeholder="Standard-Beschreibung"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={templateForm.status}
                          onValueChange={(value) =>
                            setTemplateForm({ ...templateForm, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priorität</Label>
                        <Select
                          value={templateForm.priority}
                          onValueChange={(value) =>
                            setTemplateForm({ ...templateForm, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITY_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Kategorie</Label>
                      <Select
                        value={templateForm.categoryId}
                        onValueChange={(value) =>
                          setTemplateForm({ ...templateForm, categoryId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Keine Kategorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keine Kategorie</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Sub-Tasks</Label>
                      <div className="space-y-2 mt-2">
                        {templateForm.subTasks.map((st, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                          >
                            <span className="flex-1">{st.title}</span>
                            <Button
                              onClick={() => handleRemoveSubTask(index)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            value={newSubTaskTitle}
                            onChange={(e) => setNewSubTaskTitle(e.target.value)}
                            placeholder="Sub-Task hinzufügen"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddSubTask();
                              }
                            }}
                          />
                          <Button onClick={handleAddSubTask} size="sm">
                            <Plus size={16} />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTemplate} className="flex-1">
                        <Save size={16} className="mr-2" />
                        {editingTemplateId ? 'Aktualisieren' : 'Erstellen'}
                      </Button>
                      {editingTemplateId && (
                        <Button
                          onClick={() => {
                            setTemplateForm({
                              name: '',
                              title: '',
                              content: '',
                              status: 'open',
                              priority: 'medium',
                              categoryId: '',
                              subTasks: [],
                            });
                            setEditingTemplateId(null);
                          }}
                          variant="outline"
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Template List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Vorhandene Vorlagen</CardTitle>
                    <CardDescription>
                      {templates.length} Vorlage(n)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {templates.map((tpl) => (
                        <motion.div
                          key={tpl.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium">{tpl.name}</div>
                              <div className="text-sm text-gray-500">
                                Titel: {tpl.title}
                              </div>
                              {tpl.category && (
                                <div className="flex items-center gap-1 mt-1">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tpl.category.color }}
                                  />
                                  <span className="text-xs text-gray-500">
                                    {tpl.category.name}
                                  </span>
                                </div>
                              )}
                              {tpl.subTasks.length > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {tpl.subTasks.length} Sub-Task(s)
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleEditTemplate(tpl)}
                                size="sm"
                                variant="ghost"
                              >
                                <Edit2 size={14} />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTemplate(tpl.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {templates.length === 0 && (
                        <p className="text-gray-500 text-center py-8">
                          Noch keine Vorlagen vorhanden
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}