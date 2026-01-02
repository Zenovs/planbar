'use client';

import { useState } from 'react';
import { Header } from '@/components/header';
import { motion } from 'framer-motion';
import { Users, Plus, Mail, Ticket, Shield, Trash2, Edit } from 'lucide-react';
import { UserWithStats } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TeamClientProps {
  users: UserWithStats[];
  currentUser: {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
  };
}

export function TeamClient({ users: initialUsers, currentUser }: TeamClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
  });

  const isAdmin = currentUser?.role === 'admin';

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Fehler beim Hinzufügen des Benutzers');
        return;
      }

      setUsers([...users, { ...data.user, _count: { assignedTickets: 0 } }]);
      setShowAddModal(false);
      setFormData({ name: '', email: '', password: '', role: 'member' });
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          ...(formData.password && { password: formData.password }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Fehler beim Aktualisieren des Benutzers');
        return;
      }

      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, ...data.user } : u)));
      setShowEditModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'member' });
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Möchtest du diesen Benutzer wirklich löschen?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data?.error || 'Fehler beim Löschen des Benutzers');
        return;
      }

      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      alert('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: UserWithStats) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role || 'member',
    });
    setShowEditModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Team-Verwaltung</h1>
            <p className="text-gray-600">
              Verwalte deine Team-Mitglieder und deren Zugriffsrechte.
            </p>
          </div>
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Mitglied hinzufügen
            </motion.button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users?.map((user, index) => (
            <motion.div
              key={user?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {user?.name || 'Kein Name'}
                    </h3>
                    {user?.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600 font-medium">
                        <Shield className="w-3 h-3" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && user?.id !== currentUser?.id && (
                  <div className="flex gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditModal(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteUser(user?.id || '')}
                      disabled={loading}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                )}
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{user?.email || 'Keine E-Mail'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Ticket className="w-4 h-4" />
                  <span>{user?._count?.assignedTickets || 0} offene Tickets</span>
                </div>
              </div>

              <div className="text-xs text-gray-500 pt-4 border-t border-gray-100">
                Mitglied seit: {user?.createdAt ? format(new Date(user.createdAt), 'dd.MM.yyyy', { locale: de }) : 'Unbekannt'}
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Neues Mitglied hinzufügen</h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passwort *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rolle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Mitglied</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Hinzufügen...' : 'Hinzufügen'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ name: '', email: '', password: '', role: 'member' });
                    setError('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Abbrechen
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Mitglied bearbeiten</h2>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Neues Passwort</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Leer lassen, um nicht zu ändern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rolle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="member">Mitglied</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Speichert...' : 'Speichern'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    setFormData({ name: '', email: '', password: '', role: 'member' });
                    setError('');
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Abbrechen
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
