'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, Users, Tag, Shield, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const ROLES = [
  { name: 'Mitglied', value: 'member', description: 'Kann eigene Tasks sehen und bearbeiten' },
  { name: 'Koordinator', value: 'koordinator', description: 'Kann Team-Tasks sehen und zuweisen' },
  { name: 'Projektleiter', value: 'projektleiter', description: 'Kann Teams und Benutzer verwalten' },
  { name: 'Admin', value: 'admin', description: 'Voller Zugriff auf alle Funktionen' },
];

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  _count: { tickets: number };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamId: string | null;
  weeklyHours: number;
  workloadPercent: number;
  team: { id: string; name: string } | null;
  _count: { assignedTickets: number };
}

interface Team {
  id: string;
  name: string;
  color: string;
}

interface SettingsClientProps {
  isAdmin?: boolean;
}

export default function SettingsClient({ isAdmin = true }: SettingsClientProps) {
  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: COLORS[0].value, description: '' });
  const [editCategoryData, setEditCategoryData] = useState({ name: '', color: '', description: '' });

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editUserData, setEditUserData] = useState({ role: '', teamId: '', weeklyHours: 42, workloadPercent: 100 });

  // Active Tab - Projektleiter starten auf Users-Tab
  const [activeTab, setActiveTab] = useState(isAdmin ? 'categories' : 'users');

  // Load data
  useEffect(() => {
    if (isAdmin) loadCategories();
    loadUsers();
    loadTeams();
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

  async function loadUsers() {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  async function loadTeams() {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || data || []);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
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

  // User functions
  async function updateUser(id: string) {
    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editUserData)
      });

      if (res.ok) {
        toast.success('Benutzer aktualisiert');
        setEditingUser(null);
        loadUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren des Benutzers');
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Benutzer wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;

    try {
      const res = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Benutzer gelöscht');
        loadUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Benutzers');
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-red-500';
      case 'projektleiter': return 'bg-purple-500';
      case 'koordinator': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleDisplayName = (role: string) => {
    const found = ROLES.find(r => r.value === role.toLowerCase());
    return found?.name || role;
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold mb-2">Einstellungen</h1>
        <p className="text-muted-foreground mb-8">Verwalte Kategorien und Benutzer</p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {isAdmin && (
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Kategorien
              </TabsTrigger>
            )}
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Benutzer & Teams
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab - nur für Admins */}
          {isAdmin && <TabsContent value="categories" className="space-y-6">
            {/* Neue Kategorie erstellen */}
            <Card>
              <CardHeader>
                <CardTitle>Neue Kategorie</CardTitle>
                <CardDescription>Erstelle eine neue Kategorie für deine Projekte</CardDescription>
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
              <h2 className="text-xl font-semibold">Bestehende Kategorien</h2>
              {categories.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Noch keine Kategorien vorhanden</p>
                  </CardContent>
                </Card>
              ) : (
                categories.map((category) => (
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
          </TabsContent>}

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Benutzerverwaltung
                </CardTitle>
                <CardDescription>
                  Verwalte Benutzerrollen und Arbeitszeiten. Koordinatoren können Team-Tasks sehen und zuweisen.
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4">
              {users.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">Keine Benutzer gefunden</p>
                  </CardContent>
                </Card>
              ) : (
                users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="pt-6">
                      {editingUser === user.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Rolle */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Rolle</label>
                              <Select
                                value={editUserData.role}
                                onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                      <div className="flex flex-col">
                                        <span>{r.name}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Team */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Team</label>
                              <Select
                                value={editUserData.teamId || 'none'}
                                onValueChange={(value) => setEditUserData({ ...editUserData, teamId: value === 'none' ? '' : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Kein Team</SelectItem>
                                  {teams.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Wochenstunden */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Wochenstunden</label>
                              <Input
                                type="number"
                                min="0"
                                max="60"
                                step="0.5"
                                value={editUserData.weeklyHours}
                                onChange={(e) => setEditUserData({ ...editUserData, weeklyHours: parseFloat(e.target.value) || 0 })}
                              />
                            </div>

                            {/* Pensum */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Pensum (%)</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={editUserData.workloadPercent}
                                onChange={(e) => setEditUserData({ ...editUserData, workloadPercent: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground">
                            Verfügbare Stunden/Woche: {((editUserData.weeklyHours * editUserData.workloadPercent) / 100).toFixed(1)}h
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={() => updateUser(user.id)}>
                              <Save className="w-4 h-4 mr-2" />
                              Speichern
                            </Button>
                            <Button variant="outline" onClick={() => setEditingUser(null)}>
                              <X className="w-4 h-4 mr-2" />
                              Abbrechen
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {(user.name || user.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{user.name || user.email}</h3>
                                <span className={`px-2 py-0.5 text-xs rounded-full text-white ${getRoleBadgeColor(user.role)}`}>
                                  {getRoleDisplayName(user.role)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                {user.team && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {user.team.name}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {user.workloadPercent}% ({((user.weeklyHours * user.workloadPercent) / 100).toFixed(1)}h/Woche)
                                </span>
                                <span>
                                  {user._count.assignedTickets} offene Projekte
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user.id);
                                setEditUserData({
                                  role: user.role.toLowerCase(),
                                  teamId: user.teamId || '',
                                  weeklyHours: user.weeklyHours,
                                  workloadPercent: user.workloadPercent,
                                });
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteUser(user.id)}
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
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
