'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TicketCard } from '@/components/ticket-card';
import { Search, Filter, Plus, SortAsc } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TicketWithRelations, STATUS_OPTIONS, PRIORITY_OPTIONS, SimpleUser } from '@/lib/types';

interface TicketsClientProps {
  users: SimpleUser[];
}

export function TicketsClient({ users }: TicketsClientProps) {
  const [tickets, setTickets] = useState<TicketWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (assigneeFilter !== 'all') params.append('assignedTo', assigneeFilter);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/tickets?${params.toString()}`);
      const data = await response.json();
      setTickets(data?.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Alle Tickets</h1>
            <p className="text-gray-600">
              Verwalte und organisiere deine Tickets effizient.
            </p>
          </div>
          <Link href="/tickets/new">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Plus className="w-5 h-5" />
              Neues Ticket
            </motion.button>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search className="inline w-4 h-4 mr-1" />
                Suche
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titel oder Beschreibung..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline w-4 h-4 mr-1" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle</option>
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
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zugewiesen an
              </label>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Alle</option>
                {users?.map((user) => (
                  <option key={user?.id} value={user?.id || ''}>
                    {user?.name || user?.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <label className="text-sm font-medium text-gray-700">
              <SortAsc className="inline w-4 h-4 mr-1" />
              Sortieren:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt">Erstellungsdatum</option>
              <option value="updatedAt">Aktualisiert</option>
              <option value="deadline">Deadline</option>
              <option value="priority">Priorität</option>
              <option value="status">Status</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Absteigend</option>
              <option value="asc">Aufsteigend</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">Lade Tickets...</p>
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket, index) => (
              <TicketCard key={ticket?.id} ticket={ticket} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 mb-4">Keine Tickets gefunden</p>
            <Link href="/tickets/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all"
              >
                Neues Ticket erstellen
              </motion.button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
