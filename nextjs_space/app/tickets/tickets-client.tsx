'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TicketCard } from '@/components/ticket-card';
import { Search, Filter, Plus, SortAsc, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showFilters, setShowFilters] = useState(false);

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

  const activeFiltersCount = [statusFilter, priorityFilter, assigneeFilter].filter(f => f !== 'all').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header - Stack on mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Alle Tickets</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Verwalte deine Tickets effizient.
            </p>
          </div>
          <Link href="/tickets/new" className="w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all min-h-[48px]"
            >
              <Plus className="w-5 h-5" />
              <span>Neues Ticket</span>
            </motion.button>
          </Link>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          {/* Search - Always visible */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Search className="inline w-4 h-4 mr-1" />
              Suche
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Titel oder Beschreibung..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:hidden flex items-center justify-between px-4 py-3 bg-gray-100 rounded-lg text-gray-700 font-medium min-h-[48px]"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter & Sortierung
              {activeFiltersCount > 0 && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </span>
            {showFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {/* Filters - Collapsible on mobile */}
          <AnimatePresence>
            <motion.div
              className={`sm:block ${showFilters ? 'block' : 'hidden'}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 sm:mt-0">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
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
                    Zugewiesen
                  </label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  >
                    <option value="all">Alle</option>
                    {users?.map((user) => (
                      <option key={user?.id} value={user?.id || ''}>
                        {user?.name || user?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <SortAsc className="inline w-4 h-4 mr-1" />
                    Sortieren
                  </label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [newSortBy, newSortOrder] = e.target.value.split('-');
                      setSortBy(newSortBy);
                      setSortOrder(newSortOrder);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base min-h-[48px]"
                  >
                    <option value="createdAt-desc">Neueste zuerst</option>
                    <option value="createdAt-asc">Älteste zuerst</option>
                    <option value="deadline-asc">Deadline (früh)</option>
                    <option value="deadline-desc">Deadline (spät)</option>
                    <option value="priority-desc">Priorität (hoch)</option>
                    <option value="priority-asc">Priorität (niedrig)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Tickets Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Lade Tickets...</p>
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {tickets.map((ticket, index) => (
              <TicketCard key={ticket?.id} ticket={ticket} index={index} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
            <p className="text-gray-500 mb-4 text-sm sm:text-base">Keine Tickets gefunden</p>
            <Link href="/tickets/new">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all min-h-[48px]"
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
