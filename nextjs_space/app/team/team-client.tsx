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
  Clock,
  Percent,
  Building2,
  Crown,
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

interface TeamMembership {
  id: string;
  teamId: string;
  userId: string;
  weeklyHours: number;
  workloadPercent: number;
  team: {
    id: string;
    name: string;
    color: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  teamId: string | null;
  weeklyHours: number;
  workloadPercent: number;
  createdAt: string;
  teamMemberships?: TeamMembership[];
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
  teamMembers?: {
    id: string;
    userId: string;
    weeklyHours: number;
    workloadPercent: number;
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
  }[];
  _count?: {
    tickets: number;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  users: {
    id: string;
    name: string | null;
    email: string;
    orgRole: string;
    role: string;
    image: string | null;
  }[];
  teams: {
    id: string;
    name: string;
    color: string;
    _count: { members: number };
  }[];
  _count: {
    users: number;
    teams: number;
  };
}

export default function TeamClient() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [showAssignMemberModal, setShowAssignMemberModal] = useState(false);
  const [showTeamPensumModal, setShowTeamPensumModal] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState<string>('');

  // Selected items
  const [selectedTeamForAssign, setSelectedTeamForAssign] = useState<Team | null>(null);
  const [editingMembership, setEditingMembership] = useState<{
    userId: string;
    teamId: string;
    userName: string;
    teamName: string;
    weeklyHours: number;
    workloadPercent: number;
  } | null>(null);

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

  const [assignForm, setAssignForm] = useState({
    userId: '',
    weeklyHours: 42,
    workloadPercent: 100,
  });

  const userRole = session?.user?.role?.toLowerCase() || '';
  const isAdmin = status === 'authenticated' && ['admin', 'administrator'].includes(userRole);
  const isProjektleiter = status === 'authenticated' && userRole === 'projektleiter';
  const canManageUsers = isAdmin || isProjektleiter;

  // Check if user is member of a specific team
  const isTeamMember = (team: Team): boolean => {
    if (!session?.user?.id) return false;
    return team.teamMembers?.some(m => m.userId === session.user.id) || false;
  };

  // Check if user can manage a specific team (Admin: all, Projektleiter: only own teams)
  const canManageTeam = (team: Team): boolean => {
    if (isAdmin) return true;
    if (isProjektleiter) return isTeamMember(team);
    return false;
  };

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  // Lade Organisationen nur für Admins
  useEffect(() => {
    if (isAdmin) {
      loadOrganizations();
    }
  }, [isAdmin]);

  // Wenn sich die ausgewählte Organisation ändert, Teams und Users neu laden
  useEffect(() => {
    if (isAdmin && selectedOrgId) {
      loadTeams(selectedOrgId);
      loadUsers(selectedOrgId);
    }
  }, [selectedOrgId, isAdmin]);

  const loadUsers = async (orgId?: string) => {
    try {
      const url = orgId ? `/api/users?organizationId=${orgId}` : '/api/users';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTeams = async (orgId?: string) => {
    try {
      const url = orgId ? `/api/teams?organizationId=${orgId}` : '/api/teams';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/organizations?all=true');
      const data = await res.json();
      if (res.ok && data.organizations) {
        setOrganizations(data.organizations);
        // Automatisch die erste Organisation auswählen wenn verfügbar
        if (data.organizations.length > 0 && !selectedOrgId) {
          setSelectedOrgId(data.organizations[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
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
    if (!confirm('Möchten Sie diesen Benutzer wirklich löschen?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Benutzer gelöscht');
        loadUsers();
        loadTeams();
      } else {
        toast.error(data.error || 'Fehler beim Löschen');
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
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        toast.success('Rolle aktualisiert');
        setEditingRoleId(null);
        loadUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Aktualisieren');
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
    if (!confirm('Möchten Sie dieses Team wirklich löschen?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Team gelöscht');
        loadTeams();
        loadUsers();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen des Teams');
    } finally {
      setLoading(false);
    }
  };

  // Multi-Team Membership Functions
  const handleAddMemberToTeam = async () => {
    if (!selectedTeamForAssign || !assignForm.userId) {
      toast.error('Bitte einen Benutzer auswählen');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: assignForm.userId,
          teamId: selectedTeamForAssign.id,
          weeklyHours: assignForm.weeklyHours,
          workloadPercent: assignForm.workloadPercent,
        }),
      });

      if (res.ok) {
        toast.success('Mitglied hinzugefügt');
        setShowAssignMemberModal(false);
        setAssignForm({ userId: '', weeklyHours: 42, workloadPercent: 100 });
        loadTeams();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Hinzufügen');
      }
    } catch (error) {
      toast.error('Fehler beim Hinzufügen des Mitglieds');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMemberFromTeam = async (userId: string, teamId: string) => {
    if (!confirm('Mitglied aus dem Team entfernen?')) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/team-members?userId=${userId}&teamId=${teamId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Mitglied entfernt');
        loadTeams();
      } else {
        toast.error('Fehler beim Entfernen');
      }
    } catch (error) {
      toast.error('Fehler beim Entfernen');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeamPensum = async () => {
    if (!editingMembership) return;

    setLoading(true);
    try {
      const res = await fetch('/api/team-members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: editingMembership.userId,
          teamId: editingMembership.teamId,
          weeklyHours: editingMembership.weeklyHours,
          workloadPercent: editingMembership.workloadPercent,
        }),
      });

      if (res.ok) {
        toast.success('Pensum aktualisiert');
        setShowTeamPensumModal(false);
        setEditingMembership(null);
        loadTeams();
      } else {
        toast.error('Fehler beim Aktualisieren');
      }
    } catch (error) {
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setLoading(false);
    }
  };

  // Calculate team resources based on teamMembers
  const calculateTeamResources = (team: Team) => {
    if (!team.teamMembers || team.teamMembers.length === 0) return { hours: 0, members: 0 };
    const totalHours = team.teamMembers.reduce((sum, m) => {
      return sum + (m.weeklyHours * m.workloadPercent / 100);
    }, 0);
    return { hours: totalHours, members: team.teamMembers.length };
  };

  const getRoleBadgeColor = (role: string) => {
    const r = role.toLowerCase();
    if (['admin', 'administrator'].includes(r)) return 'bg-red-100 text-red-800';
    if (r === 'projektleiter') return 'bg-purple-100 text-purple-800';
    if (r === 'koordinator') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getRoleLabel = (role: string) => {
    const r = role.toLowerCase();
    if (['admin', 'administrator'].includes(r)) return 'Admin';
    if (r === 'projektleiter') return 'Projektleiter';
    if (r === 'koordinator') return 'Koordinator';
    return 'Mitglied';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Team-Verwaltung</h1>
                <p className="text-sm sm:text-base text-gray-600">Teams und Mitglieder mit individuellem Pensum verwalten</p>
              </div>
            </div>
            {canManageUsers && (
              <div className="flex gap-2 w-full sm:w-auto">
                {isAdmin && (
                  <Button
                    onClick={() => setShowAddTeamModal(true)}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 text-white min-h-[44px]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    <span>Team erstellen</span>
                  </Button>
                )}
                <Button
                  onClick={() => setShowAddUserModal(true)}
                  variant={isAdmin ? "outline" : "default"}
                  className={`flex-1 sm:flex-none min-h-[44px] ${!isAdmin ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : ''}`}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  <span>Benutzer</span>
                </Button>
              </div>
            )}
          </div>

          {/* Organisation Auswahl - nur für Admins */}
          {isAdmin && organizations.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Crown className="w-5 h-5 text-yellow-600" />
                      <Label className="text-base font-semibold">Organisation:</Label>
                    </div>
                    <Select
                      value={selectedOrgId || ''}
                      onValueChange={(value) => setSelectedOrgId(value)}
                    >
                      <SelectTrigger className="w-full sm:w-[300px] min-h-[44px]">
                        <SelectValue placeholder="Organisation auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{org.name}</span>
                              <span className="text-gray-400 text-sm">
                                ({org._count.teams} Teams, {org._count.users} Mitglieder)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedOrgId && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {(() => {
                          const selectedOrg = organizations.find(o => o.id === selectedOrgId);
                          return selectedOrg ? (
                            <>
                              <span className="flex items-center gap-1">
                                <Building2 className="w-4 h-4 text-orange-500" />
                                <strong>{selectedOrg._count.teams}</strong> Teams
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4 text-yellow-600" />
                                <strong>{selectedOrg._count.users}</strong> Mitglieder
                              </span>
                            </>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Teams Section */}
          {teams.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Teams
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {teams.map((team) => {
                  const resources = calculateTeamResources(team);
                  return (
                    <Card key={team.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: team.color }}
                            />
                            <CardTitle className="text-lg truncate">{team.name}</CardTitle>
                          </div>
                          {canManageTeam(team) && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-w-[40px] min-h-[40px]"
                                onClick={() => {
                                  setSelectedTeamForAssign(team);
                                  setShowAssignMemberModal(true);
                                }}
                              >
                                <UserPlus className="w-4 h-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="min-w-[40px] min-h-[40px]"
                                  onClick={() => handleDeleteTeam(team.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        {team.description && (
                          <CardDescription className="text-sm mt-1">{team.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        {/* Team Ressourcen */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-600">{resources.members}</div>
                              <div className="text-xs text-gray-500">Mitglieder</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">{resources.hours.toFixed(1)}h</div>
                              <div className="text-xs text-gray-500">pro Woche</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">{(resources.hours * 4.33).toFixed(0)}h</div>
                              <div className="text-xs text-gray-500">pro Monat</div>
                            </div>
                          </div>
                        </div>

                        {/* Team Members mit individuellem Pensum */}
                        {team.teamMembers && team.teamMembers.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Mitglieder & Pensum:</p>
                            {team.teamMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                    {member.user.name?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{member.user.name || member.user.email}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Percent className="w-3 h-3" />
                                        {member.workloadPercent}%
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {(member.weeklyHours * member.workloadPercent / 100).toFixed(1)}h/Wo
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {canManageTeam(team) && (
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        setEditingMembership({
                                          userId: member.userId,
                                          teamId: team.id,
                                          userName: member.user.name || member.user.email,
                                          teamName: team.name,
                                          weeklyHours: member.weeklyHours,
                                          workloadPercent: member.workloadPercent,
                                        });
                                        setShowTeamPensumModal(true);
                                      }}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => handleRemoveMemberFromTeam(member.userId, team.id)}
                                    >
                                      <UserMinus className="w-3 h-3 text-red-600" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">Noch keine Mitglieder</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Users Section */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Alle Benutzer</h2>
            {users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4 text-sm sm:text-base">Noch keine Benutzer</p>
                  {canManageUsers && (
                    <Button
                      onClick={() => setShowAddUserModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ersten Benutzer hinzufügen
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => (
                  <Card key={user.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base truncate">{user.name || 'Unbenannt'}</CardTitle>
                            <CardDescription className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{user.email}</span>
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Rolle:</span>
                          {editingRoleId === user.id ? (
                            <div className="flex items-center gap-1">
                              <Select value={tempRole} onValueChange={setTempRole}>
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Mitglied</SelectItem>
                                  <SelectItem value="koordinator">Koordinator</SelectItem>
                                  <SelectItem value="projektleiter">Projektleiter</SelectItem>
                                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleUpdateRole(user.id, tempRole)}>
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingRoleId(null)}>
                                <X className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Badge className={`${getRoleBadgeColor(user.role)} text-xs`}>
                                {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                                {getRoleLabel(user.role)}
                              </Badge>
                              {canManageUsers && user.id !== session?.user?.id && !(isProjektleiter && user.role?.toLowerCase() === 'admin') && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setEditingRoleId(user.id); setTempRole(user.role); }}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Seit {format(new Date(user.createdAt), 'dd.MM.yyyy')}
                        </div>

                        {canManageUsers && user.id !== session?.user?.id && !(isProjektleiter && user.role?.toLowerCase() === 'admin') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="w-full mt-2"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Löschen
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neuen Benutzer hinzufügen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="max@example.com"
              />
            </div>
            <div>
              <Label>Passwort</Label>
              <Input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                placeholder="Mindestens 6 Zeichen"
              />
            </div>
            <div>
              <Label>Rolle</Label>
              <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Mitglied</SelectItem>
                  <SelectItem value="koordinator">Koordinator</SelectItem>
                  <SelectItem value="projektleiter">Projektleiter</SelectItem>
                  {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Koordinatoren: Team-Tasks sehen • Projektleiter: Teams & Benutzer verwalten
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserModal(false)}>Abbrechen</Button>
            <Button onClick={handleAddUser} disabled={loading}>
              {loading ? 'Erstellen...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team Modal */}
      <Dialog open={showAddTeamModal} onOpenChange={setShowAddTeamModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Neues Team erstellen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Team-Name</Label>
              <Input
                value={newTeamForm.name}
                onChange={(e) => setNewTeamForm({ ...newTeamForm, name: e.target.value })}
                placeholder="z.B. Entwicklung"
              />
            </div>
            <div>
              <Label>Beschreibung</Label>
              <Input
                value={newTeamForm.description}
                onChange={(e) => setNewTeamForm({ ...newTeamForm, description: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Farbe</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={newTeamForm.color}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={newTeamForm.color}
                  onChange={(e) => setNewTeamForm({ ...newTeamForm, color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTeamModal(false)}>Abbrechen</Button>
            <Button onClick={handleAddTeam} disabled={loading}>
              {loading ? 'Erstellen...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Member Modal mit Pensum */}
      <Dialog open={showAssignMemberModal} onOpenChange={setShowAssignMemberModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mitglied zu {selectedTeamForAssign?.name} hinzufügen</DialogTitle>
            <DialogDescription>Wählen Sie einen Benutzer und legen Sie das Pensum für dieses Team fest</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Benutzer</Label>
              <Select value={assignForm.userId} onValueChange={(v) => setAssignForm({ ...assignForm, userId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Benutzer auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Soll-Stunden pro Woche (100%)</Label>
              <Input
                type="number"
                min="0"
                max="60"
                value={assignForm.weeklyHours}
                onChange={(e) => setAssignForm({ ...assignForm, weeklyHours: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Pensum in % für dieses Team</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={assignForm.workloadPercent}
                onChange={(e) => setAssignForm({ ...assignForm, workloadPercent: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Verfügbare Stunden/Woche:</span>
                <span className="font-bold text-blue-600">
                  {(assignForm.weeklyHours * assignForm.workloadPercent / 100).toFixed(1)}h
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignMemberModal(false)}>Abbrechen</Button>
            <Button onClick={handleAddMemberToTeam} disabled={loading}>
              {loading ? 'Hinzufügen...' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Pensum Modal */}
      <Dialog open={showTeamPensumModal} onOpenChange={setShowTeamPensumModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pensum bearbeiten
            </DialogTitle>
            <DialogDescription>
              {editingMembership?.userName} in Team "{editingMembership?.teamName}"
            </DialogDescription>
          </DialogHeader>
          {editingMembership && (
            <div className="space-y-4">
              <div>
                <Label>Soll-Stunden pro Woche (100%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={editingMembership.weeklyHours}
                  onChange={(e) => setEditingMembership({
                    ...editingMembership,
                    weeklyHours: parseFloat(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label>Pensum in % für dieses Team</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={editingMembership.workloadPercent}
                  onChange={(e) => setEditingMembership({
                    ...editingMembership,
                    workloadPercent: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Verfügbare Stunden/Woche:</span>
                  <span className="font-bold text-blue-600">
                    {(editingMembership.weeklyHours * editingMembership.workloadPercent / 100).toFixed(1)}h
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamPensumModal(false)}>Abbrechen</Button>
            <Button onClick={handleUpdateTeamPensum} disabled={loading}>
              {loading ? 'Speichern...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

