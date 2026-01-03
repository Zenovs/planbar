'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Users,
  Mail,
  Calendar,
  Shield,
  Trash2,
  Edit,
  Plus,
  Check,
  X,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamId: string | null;
  createdAt: string;
  _count?: {
    assignedTickets: number;
  };
}

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string;
  createdAt: string;
  members: User[];
  _count?: {
    tickets: number;
  };
}

export default function TeamClient() {
  const { data: session } = useSession() || {};
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // User management modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState<string>('');

  // Team management modals
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [showAssignMemberModal, setShowAssignMemberModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeamForAssign, setSelectedTeamForAssign] = useState<Team | null>(null);

  // Form states
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
  });

  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
  });

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
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

  const handleAddUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) {
      toast.error('Bitte alle Felder ausfüllen');
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error('Passwort muss mindestens 6 Zeichen haben');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm),
      });

      if (res.ok) {
        toast.success('Benutzer erfolgreich erstellt');
        setShowAddUserModal(false);
        setNewUserForm({ name: '', email: '', password: '', role: 'member' });
        loadUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === session?.user?.id) {
      toast.error('Sie können sich nicht selbst löschen');
      return;
    }

    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Benutzer gelöscht');
        loadUsers();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        toast.success('Rolle aktualisiert');
        setEditingRoleId(null);
        loadUsers();
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren der Rolle');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeamForm.name) {
      toast.error('Bitte einen Namen eingeben');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeamForm),
      });

      if (res.ok) {
        toast.success('Team erfolgreich erstellt');
        setShowAddTeamModal(false);
        setNewTeamForm({ name: '', description: '', color: '#3b82f6' });
        loadTeams();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Teams');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Möchten Sie dieses Team wirklich löschen?')) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Team gelöscht');
        loadTeams();
        loadUsers(); // Reload users as their teamId might have changed
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUserToTeam = async (userId: string, teamId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'add' }),
      });

      if (res.ok) {
        toast.success('Benutzer dem Team hinzugefügt');
        loadUsers();
        loadTeams();
      } else {
        toast.error('Fehler beim Hinzufügen');
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUserFromTeam = async (userId: string, teamId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' }),
      });

      if (res.ok) {
        toast.success('Benutzer aus dem Team entfernt');
        loadUsers();
        loadTeams();
      } else {
        toast.error('Fehler beim Entfernen');
      }
    } catch (error) {
      toast.error('Fehler beim Entfernen des Benutzers');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrator' : 'Mitglied';
  };

  const getUnassignedUsers = () => {
    return users.filter(u => !u.teamId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Team-Verwaltung</h1>
                <p className="text-gray-600">Verwalten Sie Ihre Teams und Mitglieder</p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAddTeamModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Team erstellen
                </Button>
                <Button
                  onClick={() => setShowAddUserModal(true)}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Benutzer hinzufügen
                </Button>
              </div>
            )}
          </div>

          {/* Teams Section */}
          {isAdmin && teams.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTeamForAssign(team);
                                setShowAssignMemberModal(true);
                              }}
                            >
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {team.description && (
                        <CardDescription>{team.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Mitglieder:</span>
                          <Badge variant="secondary">{team.members.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Tickets:</span>
                          <Badge variant="secondary">{team._count?.tickets || 0}</Badge>
                        </div>
                      </div>
                      {team.members.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Teammitglieder:</p>
                          {team.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="text-sm">
                                  <p className="font-medium">{member.name}</p>
                                  <p className="text-xs text-gray-500">{member.email}</p>
                                </div>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveUserFromTeam(member.id, team.id)}
                                >
                                  <UserMinus className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Users Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Alle Benutzer</h2>
            {users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">Noch keine Teammitglieder vorhanden</p>
                  {isAdmin && (
                    <Button
                      onClick={() => setShowAddUserModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ersten Benutzer hinzufügen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{user.name || 'Unbenannt'}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Mail className="w-3 h-3" />
                                {user.email}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Offene Tickets:</span>
                            <Badge variant="outline">
                              {user._count?.assignedTickets || 0}
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Rolle:</span>
                            {editingRoleId === user.id ? (
                              <div className="flex items-center gap-2">
                                <Select
                                  value={tempRole}
                                  onValueChange={setTempRole}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Mitglied</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleUpdateRole(user.id, tempRole)}
                                  disabled={loading}
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingRoleId(null)}
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Badge className={getRoleBadgeColor(user.role)}>
                                  {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                  {getRoleLabel(user.role)}
                                </Badge>
                                {isAdmin && user.id !== session?.user?.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingRoleId(user.id);
                                      setTempRole(user.role);
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Team:</span>
                            {user.teamId ? (
                              <Badge variant="secondary">
                                {teams.find(t => t.id === user.teamId)?.name || 'Unbekannt'}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Kein Team</Badge>
                            )}
                          </div>

                          <Separator />

                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>Mitglied seit {format(new Date(user.createdAt), 'dd.MM.yyyy')}</span>
                          </div>

                          {isAdmin && user.id !== session?.user?.id && (
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={loading}
                                className="w-full"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Löschen
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neuen Benutzer hinzufügen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Benutzerkonto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="max@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            <div>
              <Label htmlFor="role">Rolle</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Mitglied</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddUser} disabled={loading}>
              {loading ? 'Erstellen...' : 'Benutzer erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Modal */}
      <Dialog open={showAddTeamModal} onOpenChange={setShowAddTeamModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neues Team erstellen</DialogTitle>
            <DialogDescription>
              Erstellen Sie ein neues Team für Ihre Organisation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="teamName">Team-Name</Label>
              <Input
                id="teamName"
                value={newTeamForm.name}
                onChange={(e) => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                placeholder="z.B. Entwicklung, Marketing, Support"
              />
            </div>
            <div>
              <Label htmlFor="teamDescription">Beschreibung (optional)</Label>
              <Input
                id="teamDescription"
                value={newTeamForm.description}
                onChange={(e) => setNewTeamForm({ ...newTeamForm, description: e.target.value })}
                placeholder="Kurze Beschreibung des Teams"
              />
            </div>
            <div>
              <Label htmlFor="teamColor">Team-Farbe</Label>
              <div className="flex gap-2">
                <Input
                  id="teamColor"
                  type="color"
                  value={newTeamForm.color}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, color: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={newTeamForm.color}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, color: e.target.value })}
                  className="flex-1"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeamModal(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleAddTeam} disabled={loading}>
              {loading ? 'Erstellen...' : 'Team erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Member Modal */}
      <Dialog open={showAssignMemberModal} onOpenChange={setShowAssignMemberModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mitglied zu {selectedTeamForAssign?.name} hinzufügen</DialogTitle>
            <DialogDescription>
              Wählen Sie ein Mitglied aus, das diesem Team hinzugefügt werden soll
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getUnassignedUsers().length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                Keine verfügbaren Benutzer. Alle Benutzer sind bereits einem Team zugewiesen.
              </p>
            ) : (
              getUnassignedUsers().map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    if (selectedTeamForAssign) {
                      handleAssignUserToTeam(user.id, selectedTeamForAssign.id);
                      setShowAssignMemberModal(false);
                    }
                  }}
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignMemberModal(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
