'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
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

interface CategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesDialog({ open, onOpenChange }: CategoriesDialogProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: COLORS[0].value, description: '' });
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '', description: '' });

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

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
      toast.error(`Kategorie kann nicht gelöscht werden (${ticketCount} Projekte zugeordnet)`);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kategorien verwalten</DialogTitle>
          <DialogDescription>
            Erstelle und verwalte Kategorien für deine Projekte
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Neue Kategorie erstellen */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Neue Kategorie erstellen</h3>
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
          <div className="space-y-3">
            <h3 className="font-semibold">Vorhandene Kategorien</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Kategorien vorhanden</p>
            ) : (
              categories.map((category) => (
                <Card key={category.id}>
                  <CardContent className="pt-4">
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
                          <Button onClick={() => updateCategory(category.id)} size="sm">
                            <Save className="w-4 h-4 mr-2" />
                            Speichern
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setEditingCategory(null)}>
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
                              {category._count.tickets} Projekt(e)
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
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
