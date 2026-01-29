'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from '@/components/header';
import {
  Building2,
  Users,
  Mail,
  Plus,
  Edit2,
  Trash2,
  Crown,
  UserPlus,
  Copy,
  Check,
  X,
  Loader2,
  Shield,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  Settings,
  Eye,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { users: number; teams: number };
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
  invites: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    createdAt: string;
  }[];
}

const ORG_ROLES = [
  { value: 'org_admin', label: 'Org-Admin', icon: Crown, color: 'text-yellow-600 bg-yellow-100' },
  { value: 'admin_organisation', label: 'Admin Organisation', icon: Building2, color: 'text-orange-600 bg-orange-100' },
  { value: 'projektleiter', label: 'Projektleiter', icon: Shield, color: 'text-purple-600 bg-purple-100' },
  { value: 'koordinator', label: 'Koordinator', icon: Users, color: 'text-blue-600 bg-blue-100' },
  { value: 'member', label: 'Mitglied', icon: User, color: 'text-gray-600 bg-gray-100' },
];

export default function OrganisationClient() {
  const { data: session } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [canCreateOrganization, setCanCreateOrganization] = useState(false);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('members');
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      // Erst normale Anfrage
      const res = await fetch('/api/organizations');
      const data = await res.json();
      
      if (res.ok) {
        setOrganization(data.organization);
        setIsOrgAdmin(data.isOrgAdmin);
        setCanCreateOrganization(data.canCreateOrganization || false);
        setUserRole(data.userRole || '');
        
        const role = data.userRole?.toLowerCase() || '';
        const isSysAdmin = role === 'admin' || role === 'administrator';
        setIsSystemAdmin(isSysAdmin);
        
        // Wenn System-Admin, alle Organisationen laden
        if (isSysAdmin) {
          const allRes = await fetch('/api/organizations?all=true');
          const allData = await allRes.json();
          if (allRes.ok && allData.organizations) {
            setAllOrganizations(allData.organizations);
          }
        }
        
        if (!data.organization && data.canCreateOrganization) {
          setShowCreateOrg(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) return;

    setProcessing('create');
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, description: orgDescription }),
      });

      if (res.ok) {
        toast.success('Organisation erstellt!');
        setShowCreateOrg(false);
        fetchOrganization();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Erstellen');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setProcessing(null);
    }
  };

  const inviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setProcessing('invite');
    try {
      const res = await fetch('/api/organizations/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Einladung an ${inviteEmail} gesendet!`);
        setInviteEmail('');
        setLastInviteUrl(data.inviteUrl);
        fetchOrganization();
      } else {
        toast.error(data.error || 'Fehler beim Einladen');
      }
    } catch (error) {
      toast.error('Fehler beim Einladen');
    } finally {
      setProcessing(null);
    }
  };

  const updateMemberRole = async (userId: string, newRole: string) => {
    setProcessing(userId);
    try {
      const res = await fetch('/api/organizations/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, orgRole: newRole }),
      });

      if (res.ok) {
        toast.success('Rolle aktualisiert');
        setEditingMember(null);
        fetchOrganization();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler');
      }
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setProcessing(null);
    }
  };

  const removeMember = async (userId: string, userName: string) => {
    if (!confirm(`${userName} wirklich aus der Organisation entfernen?`)) return;

    setProcessing(userId);
    try {
      const res = await fetch(`/api/organizations/members?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Mitglied entfernt');
        fetchOrganization();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler');
      }
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setProcessing(null);
    }
  };

  const cancelInvite = async (inviteId: string) => {
    setProcessing(inviteId);
    try {
      const res = await fetch(`/api/organizations/invite?id=${inviteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Einladung zurückgezogen');
        fetchOrganization();
      }
    } catch (error) {
      toast.error('Fehler');
    } finally {
      setProcessing(null);
    }
  };

  const copyInviteLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    toast.success('Link kopiert!');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const getRoleInfo = (role: string) => {
    return ORG_ROLES.find(r => r.value === role) || ORG_ROLES[4];
  };

  const deleteOrganization = async (orgId: string, orgName: string) => {
    if (!confirm(`Organisation "${orgName}" wirklich löschen? Alle Teams und Mitgliederzuordnungen werden entfernt!`)) return;

    setProcessing(orgId);
    try {
      const res = await fetch(`/api/organizations?id=${orgId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success(`Organisation "${orgName}" gelöscht`);
        fetchOrganization();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  // Admin-Übersicht: Alle Organisationen anzeigen (auch wenn Admin selbst keine Org hat)
  if (isSystemAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
                  <Layers className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Alle Organisationen</h1>
                  <p className="text-gray-500 mt-1">Admin-Übersicht aller {allOrganizations.length} Organisationen</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateOrg(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Neue Organisation</span>
              </button>
            </div>

            {/* Gesamt-Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-blue-600">
                  <Building2 className="w-5 h-5" />
                  <span className="text-2xl font-bold">{allOrganizations.length}</span>
                </div>
                <p className="text-sm text-gray-500">Organisationen</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-purple-600">
                  <Users className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {allOrganizations.reduce((sum, org) => sum + (org._count?.users || org.users?.length || 0), 0)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Benutzer gesamt</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-green-600">
                  <Shield className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {allOrganizations.reduce((sum, org) => sum + (org._count?.teams || org.teams?.length || 0), 0)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Teams gesamt</p>
              </div>
              <div className="bg-white rounded-lg p-4 shadow-sm border">
                <div className="flex items-center gap-2 text-orange-600">
                  <Crown className="w-5 h-5" />
                  <span className="text-2xl font-bold">
                    {allOrganizations.reduce((sum, org) => sum + (org.users?.filter(u => u.orgRole === 'org_admin').length || 0), 0)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">Org-Admins</p>
              </div>
            </div>
          </div>

          {/* Organisation erstellen Modal */}
          <AnimatePresence>
            {showCreateOrg && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowCreateOrg(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold">Neue Organisation</h2>
                      <button onClick={() => setShowCreateOrg(false)} className="p-1 hover:bg-white/20 rounded">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <form onSubmit={createOrganization} className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="z.B. Meine Agentur GmbH"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                      <textarea
                        value={orgDescription}
                        onChange={(e) => setOrgDescription(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Kurze Beschreibung..."
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateOrg(false)}
                        className="flex-1 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        disabled={processing === 'create'}
                        className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing === 'create' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Erstellen
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Organisationen-Liste */}
          <div className="space-y-4">
            {allOrganizations.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Organisationen</h3>
                <p className="text-gray-500 mb-4">Es wurden noch keine Organisationen erstellt.</p>
                <button
                  onClick={() => setShowCreateOrg(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:opacity-90"
                >
                  <Plus className="w-5 h-5" />
                  Erste Organisation erstellen
                </button>
              </div>
            )}
            {allOrganizations.map((org) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                <button
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 text-lg">{org.name}</h3>
                      <p className="text-sm text-gray-500">
                        {org._count?.users || org.users?.length || 0} Mitglieder · {org._count?.teams || org.teams?.length || 0} Teams
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOrganization(org.id, org.name);
                      }}
                      disabled={processing === org.id}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Organisation löschen"
                    >
                      {processing === org.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                    {expandedOrg === org.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </button>

                <AnimatePresence>
                  {expandedOrg === org.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <div className="p-5 space-y-6">
                        {/* Teams */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            Teams ({org.teams?.length || 0})
                          </h4>
                          {org.teams && org.teams.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {org.teams.map((team) => (
                                <div
                                  key={team.id}
                                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: team.color }}
                                  />
                                  <div>
                                    <p className="font-medium text-gray-900">{team.name}</p>
                                    <p className="text-xs text-gray-500">{team._count?.members || 0} Mitglieder</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Keine Teams</p>
                          )}
                        </div>

                        {/* Mitglieder */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            Mitglieder ({org.users?.length || 0})
                          </h4>
                          {org.users && org.users.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {org.users.map((user) => {
                                const roleInfo = getRoleInfo(user.orgRole);
                                const RoleIcon = roleInfo.icon;
                                return (
                                  <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                                        {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900 text-sm">{user.name || user.email}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                      </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}>
                                      <RoleIcon className="w-3 h-3 inline mr-1" />
                                      {roleInfo.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Keine Mitglieder</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Keine Organisation - Info oder Erstellen anzeigen
  if (!organization) {
    // User hat keine Berechtigung, Organisation zu erstellen
    if (!canCreateOrganization) {
      return (
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main className="max-w-xl mx-auto px-4 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-gray-400 to-gray-500 p-6 text-center text-white">
                <Building2 className="w-12 h-12 mx-auto mb-3" />
                <h1 className="text-2xl font-bold">Keine Organisation</h1>
                <p className="mt-2 opacity-90">Sie sind noch keiner Organisation zugeordnet</p>
              </div>
              <div className="p-6 text-center">
                <p className="text-gray-600 mb-4">
                  Sie müssen von einem <strong>Admin</strong> oder <strong>Admin Organisation</strong> zu einer Organisation eingeladen werden.
                </p>
                <p className="text-sm text-gray-500">
                  Kontaktieren Sie Ihren Administrator, um Zugang zu einer Organisation zu erhalten.
                </p>
              </div>
            </motion.div>
          </main>
        </div>
      );
    }

    // User kann Organisation erstellen
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center text-white">
              <Building2 className="w-12 h-12 mx-auto mb-3" />
              <h1 className="text-2xl font-bold">Organisation erstellen</h1>
              <p className="mt-2 opacity-90">Starten Sie mit Ihrer eigenen Organisation</p>
            </div>

            <form onSubmit={createOrganization} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name der Organisation *
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. Meine Agentur GmbH"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Kurze Beschreibung..."
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={processing === 'create'}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === 'create' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                Organisation erstellen
              </button>
            </form>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-5xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{organization.name}</h1>
              {organization.description && (
                <p className="text-gray-500 mt-1">{organization.description}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 text-blue-600">
                <Users className="w-5 h-5" />
                <span className="text-2xl font-bold">{organization.users.length}</span>
              </div>
              <p className="text-sm text-gray-500">Mitglieder</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 text-purple-600">
                <Shield className="w-5 h-5" />
                <span className="text-2xl font-bold">{organization.teams.length}</span>
              </div>
              <p className="text-sm text-gray-500">Teams</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 text-yellow-600">
                <Crown className="w-5 h-5" />
                <span className="text-2xl font-bold">
                  {organization.users.filter(u => u.orgRole === 'org_admin').length}
                </span>
              </div>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center gap-2 text-green-600">
                <Mail className="w-5 h-5" />
                <span className="text-2xl font-bold">{organization.invites.length}</span>
              </div>
              <p className="text-sm text-gray-500">Offene Einladungen</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {/* Mitglieder einladen (nur für Admins) */}
          {isOrgAdmin && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setShowInviteModal(!showInviteModal)}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg text-white">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Mitglied einladen</h3>
                    <p className="text-sm text-gray-500">Neue Teammitglieder per E-Mail einladen</p>
                  </div>
                </div>
                {showInviteModal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              <AnimatePresence>
                {showInviteModal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t"
                  >
                    <form onSubmit={inviteMember} className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">E-Mail-Adresse</label>
                          <input
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="name@firma.ch"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Rolle</label>
                          <select
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {ORG_ROLES.map((role) => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={processing === 'invite'}
                        className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {processing === 'invite' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Einladung senden
                      </button>

                      {lastInviteUrl && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800 font-medium mb-2">Einladungslink (alternativ):</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={lastInviteUrl}
                              readOnly
                              className="flex-1 px-3 py-1.5 bg-white border rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => copyInviteLink(lastInviteUrl)}
                              className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm flex items-center gap-1"
                            >
                              {copiedLink === lastInviteUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mitglieder-Liste */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'members' ? '' : 'members')}
              className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Mitglieder ({organization.users.length})</h3>
                  <p className="text-sm text-gray-500">Alle Mitglieder der Organisation</p>
                </div>
              </div>
              {expandedSection === 'members' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            <AnimatePresence>
              {expandedSection === 'members' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t"
                >
                  <div className="p-5 space-y-3">
                    {organization.users.map((member) => {
                      const roleInfo = getRoleInfo(member.orgRole);
                      const RoleIcon = roleInfo.icon;
                      const isCurrentUser = member.email === session?.user?.email;

                      return (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                              {(member.name || member.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.name || 'Kein Name'}
                                {isCurrentUser && <span className="text-gray-400 text-sm ml-2">(Sie)</span>}
                              </p>
                              <p className="text-sm text-gray-500">{member.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {editingMember === member.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  defaultValue={member.orgRole}
                                  onChange={(e) => updateMemberRole(member.id, e.target.value)}
                                  className="px-3 py-1.5 border rounded-lg text-sm"
                                  disabled={processing === member.id}
                                >
                                  {ORG_ROLES.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => setEditingMember(null)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${roleInfo.color}`}>
                                  <RoleIcon className="w-4 h-4" />
                                  {roleInfo.label}
                                </span>

                                {isOrgAdmin && !isCurrentUser && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => setEditingMember(member.id)}
                                      className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                      title="Rolle ändern"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => removeMember(member.id, member.name || member.email)}
                                      disabled={processing === member.id}
                                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                                      title="Entfernen"
                                    >
                                      {processing === member.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Offene Einladungen */}
          {isOrgAdmin && organization.invites.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === 'invites' ? '' : 'invites')}
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">Offene Einladungen ({organization.invites.length})</h3>
                    <p className="text-sm text-gray-500">Noch nicht angenommene Einladungen</p>
                  </div>
                </div>
                {expandedSection === 'invites' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              <AnimatePresence>
                {expandedSection === 'invites' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t"
                  >
                    <div className="p-5 space-y-3">
                      {organization.invites.map((invite) => {
                        const roleInfo = getRoleInfo(invite.role);
                        const expiresIn = Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                        return (
                          <div
                            key={invite.id}
                            className="flex items-center justify-between p-4 border border-yellow-200 bg-yellow-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700">
                                <Mail className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{invite.email}</p>
                                <p className="text-sm text-gray-500">
                                  Läuft ab in {expiresIn} Tagen • Rolle: {roleInfo.label}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => cancelInvite(invite.id)}
                              disabled={processing === invite.id}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Einladung zurückziehen"
                            >
                              {processing === invite.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
