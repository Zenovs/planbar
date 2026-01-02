'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { StatusBadge } from '@/components/status-badge';
import { PriorityBadge } from '@/components/priority-badge';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Trash2, Calendar, User as UserIcon, Clock } from 'lucide-react';
import Link from 'next/link';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, SimpleUser, TicketWithRelations } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface TicketDetailClientProps {
  ticket: TicketWithRelations;
  users: SimpleUser[];
}

export function TicketDetailClient({ ticket: initialTicket, users }: TicketDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    title: initialTicket?.title || '',
    description: initialTicket?.description || '',
    status: initialTicket?.status || 'open',
    priority: initialTicket?.priority || 'medium',
    assignedToId: initialTicket?.assignedToId || '',
    deadline: initialTicket?.deadline
      ? format(new Date(initialTicket.deadline), 'yyyy-MM-dd')
      : '',
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`/api/tickets/${initialTicket?.id || ''}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || null,
          deadline: formData.deadline || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || 'Fehler beim Aktualisieren des Tickets');
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Öchtest du dieses Ticket wirklich löschen?')) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/tickets/${initialTicket?.id || ''}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        setError('Fehler beim Löschen des Tickets');
        return;
      }

      router.push('/tickets');
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
          {!isEditing ? (
            <>
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <StatusBadge status={initialTicket?.status || 'open'} />
                    <PriorityBadge priority={initialTicket?.priority || 'medium'} />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {initialTicket?.title || 'Kein Titel'}
                  </h1>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
                  >
                    Bearbeiten
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {initialTicket?.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Beschreibung</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{initialTicket.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {initialTicket?.assignedTo && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <UserIcon className="w-5 h-5" />
                      <span className="font-medium">Zugewiesen an</span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {initialTicket.assignedTo.name || initialTicket.assignedTo.email}
                    </p>
                  </div>
                )}

                {initialTicket?.deadline && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <Calendar className="w-5 h-5" />
                      <span className="font-medium">Deadline</span>
                    </div>
                    <p className="text-gray-900 font-semibold">
                      {format(new Date(initialTicket.deadline), 'dd. MMMM yyyy', { locale: de })}
                    </p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Erstellt: {initialTicket?.createdAt ? format(new Date(initialTicket.createdAt), 'dd.MM.yyyy HH:mm', { locale: de }) : 'Unbekannt'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4" />
                    <span>
                      von {initialTicket?.createdBy?.name || initialTicket?.createdBy?.email || 'Unbekannt'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ticket bearbeiten</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Speichert...' : 'Änderungen speichern'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Abbrechen
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
