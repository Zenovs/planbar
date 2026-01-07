'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { ProjektCard } from '@/components/ticket-card';
import { TemplatesDialog } from '@/components/templates-dialog';
import { CategoriesDialog } from '@/components/categories-dialog';
import { Search, Filter, Plus, SortAsc, ChevronDown, ChevronUp, FolderKanban, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ProjektWithRelations, STATUS_OPTIONS, PRIORITY_OPTIONS, SimpleUser } from '@/lib/types';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface ProjektsClientProps {
  users: SimpleUser[];
}

export function ProjektsClient({ users }: ProjektsClientProps) {
  const [tickets, setTickets] = useState<ProjektWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [templatesDialogOpen, setTemplatesDialogOpen] = useState(false);
  const [categoriesDialogOpen, setCategoriesDialogOpen] = useState(false);
  
  // Kategorie-Filter
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder]);

  // Kategorien aus Tickets extrahieren nachdem Tickets geladen
  useEffect(() => {
    if (tickets.length > 0) {
      extractCategoriesFromTickets();
    }
  }, [tickets]);

  // Kategorien aus den geladenen Tickets extrahieren (statt aus API)
  const extractCategoriesFromTickets = () => {
    const uniqueCategories = new Map<string, Category>();
    tickets.forEach(ticket => {
      if (ticket.category) {
        uniqueCategories.set(ticket.category.id, {
          id: ticket.category.id,
          name: ticket.category.name,
          color: ticket.category.color || '#6B7280'
        });
      }
    });
    setCategories(Array.from(uniqueCategories.values()));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Alle Projekte</h1>
            <p className="text-sm sm:text-base text-gray-600">
              Verwalte deine Projekts effizient.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategoriesDialogOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:shadow-md transition-all min-h-[48px]"
            >
              <Tags className="w-5 h-5" />
              <span>Kategorien verwalten</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setTemplatesDialogOpen(true)}
              className="flex items-center justify-center gap-2 bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-lg font-medium hover:shadow-md transition-all min-h-[48px]"
            >
              <FolderKanban className="w-5 h-5" />
              <span>Vorlagen verwalten</span>
            </motion.button>
            <Link href="/tickets/new" className="w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all min-h-[48px]"
              >
                <Plus className="w-5 h-5" />
                <span>Neues Projekt</span>
              </motion.button>
            </Link>
          </div>
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
                    <option value="priority-desc">Priorität (hoch)</option>
                    <option value="priority-asc">Priorität (niedrig)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Kategorie-Filter mit Checkboxen */}
        {categories.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
            <button
              onClick={() => setShowCategoryFilter(!showCategoryFilter)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="flex items-center gap-2 font-medium text-gray-700">
                <Tags className="w-4 h-4" />
                Kategorien filtern
                {selectedCategories.length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {selectedCategories.length}
                  </span>
                )}
              </span>
              {showCategoryFilter ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {showCategoryFilter && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <p className="text-sm text-gray-500 mb-3">
                    Wähle Kategorien aus, um nur Projekte dieser Kategorien anzuzeigen:
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                          selectedCategories.includes(category.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={() => setSelectedCategories([])}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      Alle Filter zurücksetzen
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Projekts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600 text-sm sm:text-base">Lade Projekts...</p>
          </div>
        ) : (() => {
          // Filter Tickets nach ausgewählten Kategorien (clientseitig)
          const filteredTickets = selectedCategories.length > 0
            ? tickets.filter(ticket => ticket.categoryId && selectedCategories.includes(ticket.categoryId))
            : tickets;
          
          return filteredTickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredTickets.map((ticket, index) => (
                <ProjektCard key={ticket?.id} ticket={ticket} index={index} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
              <p className="text-gray-500 mb-4 text-sm sm:text-base">
                {selectedCategories.length > 0 ? 'Keine Projekte für die ausgewählten Kategorien gefunden' : 'Keine Projekte gefunden'}
              </p>
              <Link href="/tickets/new">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all min-h-[48px]"
                >
                  Neues Projekt erstellen
                </motion.button>
              </Link>
            </div>
          );
        })()}
      </main>

      {/* Templates Dialog */}
      <TemplatesDialog
        open={templatesDialogOpen}
        onOpenChange={setTemplatesDialogOpen}
      />

      {/* Categories Dialog */}
      <CategoriesDialog
        open={categoriesDialogOpen}
        onOpenChange={setCategoriesDialogOpen}
      />
    </div>
  );
}
