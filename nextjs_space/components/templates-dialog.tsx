'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Save, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface TemplateSubTicket {
  id?: string;
  title: string;
  description?: string;
  order: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  subTickets: TemplateSubTicket[];
  team: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateCreated?: () => void;
}

export function TemplatesDialog({ open, onOpenChange, onTemplateCreated }: TemplatesDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subTickets: [] as Omit<TemplateSubTicket, 'id'>[],
  });
  const [newSubTicket, setNewSubTicket] = useState({ title: '', description: '' });

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        toast.error('Fehler beim Laden der Vorlagen');
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Fehler beim Laden der Vorlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({ name: '', description: '', subTickets: [] });
    setEditingTemplate(null);
    setView('create');
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      subTickets: template.subTickets.map(st => ({
        title: st.title,
        description: st.description || '',
        order: st.order
      }))
    });
    setView('edit');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Vorlage wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Vorlage gelöscht');
        loadTemplates();
        onTemplateCreated?.();
      } else {
        toast.error('Fehler beim Löschen der Vorlage');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Fehler beim Löschen der Vorlage');
    }
  };

  const addSubTicket = () => {
    if (!newSubTicket.title.trim()) {
      toast.error('Titel ist erforderlich');
      return;
    }

    setFormData({
      ...formData,
      subTickets: [
        ...formData.subTickets,
        {
          title: newSubTicket.title.trim(),
          description: newSubTicket.description.trim() || undefined,
          order: formData.subTickets.length
        }
      ]
    });
    setNewSubTicket({ title: '', description: '' });
  };

  const removeSubTicket = (index: number) => {
    setFormData({
      ...formData,
      subTickets: formData.subTickets.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    try {
      setLoading(true);
      const url = editingTemplate ? `/api/templates/${editingTemplate.id}` : '/api/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success(editingTemplate ? 'Vorlage aktualisiert' : 'Vorlage erstellt');
        setView('list');
        loadTemplates();
        onTemplateCreated?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Speichern der Vorlage');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('Fehler beim Speichern der Vorlage');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setView('list');
    setEditingTemplate(null);
    setFormData({ name: '', description: '', subTickets: [] });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view !== 'list' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {view === 'list' && 'Vorlagen verwalten'}
            {view === 'create' && 'Neue Vorlage erstellen'}
            {view === 'edit' && 'Vorlage bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {view === 'list' && 'Verwalten Sie Ihre Ticket-Vorlagen mit vorgefertigten Sub-Tickets'}
            {view !== 'list' && 'Definieren Sie die Vorlage und ihre Sub-Tickets'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <Button
                onClick={handleCreate}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Neue Vorlage erstellen
              </Button>

              {loading ? (
                <div className="text-center py-8 text-gray-500">Laden...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Noch keine Vorlagen vorhanden
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900">
                            {template.name}
                          </h3>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {template.subTickets.length} Sub-Ticket(s)
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {(view === 'create' || view === 'edit') && (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="z.B. Standard-Projekt"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optionale Beschreibung der Vorlage"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Tickets
                </label>
                <div className="space-y-3 mb-4">
                  {formData.subTickets.map((st, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">{st.title}</div>
                        {st.description && (
                          <div className="text-xs text-gray-600 mt-1">{st.description}</div>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubTicket(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                  <Input
                    value={newSubTicket.title}
                    onChange={(e) => setNewSubTicket({ ...newSubTicket, title: e.target.value })}
                    placeholder="Sub-Ticket Titel"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubTicket();
                      }
                    }}
                  />
                  <Textarea
                    value={newSubTicket.description}
                    onChange={(e) => setNewSubTicket({ ...newSubTicket, description: e.target.value })}
                    placeholder="Sub-Ticket Beschreibung (optional)"
                    rows={2}
                  />
                  <Button
                    type="button"
                    onClick={addSubTicket}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Sub-Ticket hinzufügen
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                  disabled={loading}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg"
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Speichern...' : 'Speichern'}
                </Button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
