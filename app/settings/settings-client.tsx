'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const COLORS = [
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Grün', value: '#10b981' },
  { name: 'Rot', value: '#ef4444' },
  { name: 'Gelb', value: '#f59e0b' },
  { name: 'Lila', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Türkis', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
];

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  _count: { tickets: number };
}

interface Template {
  id: string;
  name: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  categoryId: string | null;
  category: { id: string; name: string; color: string } | null;
  subTasks: { id: string; title: string; position: number }[];
  _count: { subTasks: number };
}

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState('categories');
  
  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: COLORS[0].value, description: '' });
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '', description: '' });

  // Templates State
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    categoryId: '',
    subTasks: [] as { title: string; position: number }[]
  });
  const [editTemplateData, setEditTemplateData] = useState({
    name: '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    categoryId: '',
    subTasks: [] as { title: string; position: number }[]
  });
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [editSubTaskTitle, setEditSubTaskTitle] = useState('');

  // Load data
  useEffect(() => {
    loadCategories();
    loadTemplates();
  }, []);

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

  // Category functions
  async function createCategory() {
    if (!newCategory.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        toast.success('Kategorie erstellt');
        setNewCategory({ name: '', color: COLORS[0].value, description: '' });
        loadCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen der Kategorie');
    }
  }

  async function updateCategory(id: string) {
    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editCategoryData)
      });

      if (res.ok) {
        toast.success('Kategorie aktualisiert');
        setEditingCategory(null);
        loadCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Kategorie');
    }
  }

  async function deleteCategory(id: string, ticketCount: number) {
    if (ticketCount > 0) {
      toast.error(`Kategorie kann nicht gelöscht werden (${ticketCount} Tickets zugeordnet)`);
      return;
    }

    if (!confirm('Kategorie wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Kategorie gelöscht');
        loadCategories();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen der Kategorie');
    }
  }

  // Template functions
  async function createTemplate() {
    if (!newTemplate.name.trim() || !newTemplate.title.trim()) {
      toast.error('Name und Titel sind erforderlich');
      return;
    }

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTemplate,
          categoryId: newTemplate.categoryId || null
        })
      });

      if (res.ok) {
        toast.success('Vorlage erstellt');
        setNewTemplate({
          name: '',
          title: '',
          description: '',
          status: 'open',
          priority: 'medium',
          categoryId: '',
          subTasks: []
        });
        loadTemplates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen der Vorlage');
    }
  }

  async function updateTemplate(id: string) {
    try {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editTemplateData,
          categoryId: editTemplateData.categoryId || null
        })
      });

      if (res.ok) {
        toast.success('Vorlage aktualisiert');
        setEditingTemplate(null);
        loadTemplates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Vorlage');
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Vorlage wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Vorlage gelöscht');
        loadTemplates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen der Vorlage');
    }
  }

  function addSubTask(isEditing: boolean) {
    const title = isEditing ? editSubTaskTitle : newSubTaskTitle;
    if (!title.trim()) return;

    if (isEditing) {
      setEditTemplateData({
        ...editTemplateData,
        subTasks: [...editTemplateData.subTasks, { title, position: editTemplateData.subTasks.length }]
      });
      setEditSubTaskTitle('');
    } else {
      setNewTemplate({
        ...newTemplate,
        subTasks: [...newTemplate.subTasks, { title, position: newTemplate.subTasks.length }]
      });
      setNewSubTaskTitle('');
    }
  }

  function removeSubTask(index: number, isEditing: boolean) {
    if (isEditing) {
      setEditTemplateData({
        ...editTemplateData,
        subTasks: editTemplateData.subTasks.filter((_, i) => i !== index)
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        subTasks: newTemplate.subTasks.filter((_, i) => i !== index)
      });
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Einstellungen</h1>
        <p className="text-muted-foreground mb-8">Verwalte Kategorien und Vorlagen für deine Tickets</p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="templates">Vorlagen</TabsTrigger>
          </TabsList>

          {/* Kategorien Tab */}
          <TabsContent value="categories" className="space-y-6">
            {/* Neue Kategorie erstellen */}
            <Card>
              <CardHeader>
                <CardTitle>Neue Kategorie</CardTitle>
                <CardDescription>Erstelle eine neue Kategorie für deine Tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      placeholder="Name"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    />
                    <Select
                      value={newCategory.color}
                      onValueChange={(value) => setNewCategory({ ...newCategory, color: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLORS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: c.value }}
                              />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Beschreibung (optional)"
                      value={newCategory.description}
                      onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    />
                  </div>
                  <Button onClick={createCategory}>
                    <Plus className="w-4 h-4 mr-2" />
                    Kategorie erstellen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bestehende Kategorien */}
            <div className="grid gap-4">
              {categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="pt-6">
                    {editingCategory === category.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Input
                            value={editCategoryData.name}
                            onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                          />
                          <Select
                            value={editCategoryData.color}
                            onValueChange={(value) => setEditCategoryData({ ...editCategoryData, color: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLORS.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-4 h-4 rounded-full"
                                      style={{ backgroundColor: c.value }}
                                    />
                                    {c.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={editCategoryData.description || ''}
                            onChange={(e) => setEditCategoryData({ ...editCategoryData, description: e.target.value })}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => updateCategory(category.id)}>
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                          </Button>
                          <Button variant="outline" onClick={() => setEditingCategory(null)}>
                            <X className="w-4 h-4 mr-2" />
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-8 h-8 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <div>
                            <h3 className="font-semibold">{category.name}</h3>
                            {category.description && (
                              <p className="text-sm text-muted-foreground">{category.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {category._count.tickets} Ticket(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCategory(category.id);
                              setEditCategoryData({
                                name: category.name,
                                color: category.color,
                                description: category.description || ''
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteCategory(category.id, category._count.tickets)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Vorlagen Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Neue Vorlage erstellen */}
            <Card>
              <CardHeader>
                <CardTitle>Neue Vorlage</CardTitle>
                <CardDescription>Erstelle eine wiederverwendbare Ticket-Vorlage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      placeholder="Vorlagen-Name (eindeutig)"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    />
                    <Input
                      placeholder="Ticket-Titel"
                      value={newTemplate.title}
                      onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                    />
                  </div>
                  <Textarea
                    placeholder="Beschreibung"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select
                      value={newTemplate.status}
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Offen</SelectItem>
                        <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                        <SelectItem value="completed">Erledigt</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newTemplate.priority}
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={newTemplate.categoryId}
                      onValueChange={(value) => setNewTemplate({ ...newTemplate, categoryId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Kategorie (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Keine</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Sub-Tasks */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Sub-Tasks</h4>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Sub-Task hinzufügen"
                        value={newSubTaskTitle}
                        onChange={(e) => setNewSubTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addSubTask(false)}
                      />
                      <Button onClick={() => addSubTask(false)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {newTemplate.subTasks.map((st, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                          <span className="text-sm">{st.title}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubTask(index, false)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={createTemplate}>
                    <Plus className="w-4 h-4 mr-2" />
                    Vorlage erstellen
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bestehende Vorlagen */}
            <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id}>
                  <CardContent className="pt-6">
                    {editingTemplate === template.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Input
                            value={editTemplateData.name}
                            onChange={(e) => setEditTemplateData({ ...editTemplateData, name: e.target.value })}
                          />
                          <Input
                            value={editTemplateData.title}
                            onChange={(e) => setEditTemplateData({ ...editTemplateData, title: e.target.value })}
                          />
                        </div>
                        <Textarea
                          value={editTemplateData.description || ''}
                          onChange={(e) => setEditTemplateData({ ...editTemplateData, description: e.target.value })}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Select
                            value={editTemplateData.status}
                            onValueChange={(value) => setEditTemplateData({ ...editTemplateData, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Offen</SelectItem>
                              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                              <SelectItem value="completed">Erledigt</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={editTemplateData.priority}
                            onValueChange={(value) => setEditTemplateData({ ...editTemplateData, priority: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Niedrig</SelectItem>
                              <SelectItem value="medium">Mittel</SelectItem>
                              <SelectItem value="high">Hoch</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={editTemplateData.categoryId || ''}
                            onValueChange={(value) => setEditTemplateData({ ...editTemplateData, categoryId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Kategorie" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Keine</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sub-Tasks beim Bearbeiten */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Sub-Tasks</h4>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Sub-Task hinzufügen"
                              value={editSubTaskTitle}
                              onChange={(e) => setEditSubTaskTitle(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addSubTask(true)}
                            />
                            <Button onClick={() => addSubTask(true)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="space-y-1">
                            {editTemplateData.subTasks.map((st, index) => (
                              <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                                <span className="text-sm">{st.title}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSubTask(index, true)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={() => updateTemplate(template.id)}>
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                          </Button>
                          <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                            <X className="w-4 h-4 mr-2" />
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="font-semibold">{template.name}</h3>
                          <p className="text-sm">{template.title}</p>
                          {template.description && (
                            <p className="text-sm text-muted-foreground">{template.description}</p>
                          )}
                          <div className="flex gap-2 items-center mt-2">
                            {template.category && (
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: template.category.color }}
                                />
                                <span className="text-xs text-muted-foreground">{template.category.name}</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {template._count.subTasks} Sub-Task(s)
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTemplate(template.id);
                              setEditTemplateData({
                                name: template.name,
                                title: template.title,
                                description: template.description || '',
                                status: template.status,
                                priority: template.priority,
                                categoryId: template.categoryId || '',
                                subTasks: template.subTasks
                              });
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
