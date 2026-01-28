'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarDays, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Trash2,
  User,
  Palmtree,
  GraduationCap,
  Heart,
  Coffee,
  Filter,
  Link2
} from 'lucide-react';
import { MocoIntegration } from '@/components/moco-integration';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Absence {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  description: string | null;
  color: string;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface CalendarPlanningClientProps {
  currentUser: { id: string; name: string | null; email: string; role: string | null };
  teamMembers: { id: string; name: string | null; email: string }[];
  canViewOthers: boolean;
  isAdmin: boolean;
}

const ABSENCE_TYPES = [
  { value: 'vacation', label: 'Ferien', icon: Palmtree, color: '#22c55e' },
  { value: 'workshop', label: 'Workshop/Schulung', icon: GraduationCap, color: '#3b82f6' },
  { value: 'sick', label: 'Krank', icon: Heart, color: '#ef4444' },
  { value: 'other', label: 'Sonstiges', icon: Coffee, color: '#a855f7' },
];

export function CalendarPlanningClient({ 
  currentUser, 
  teamMembers, 
  canViewOthers,
  isAdmin 
}: CalendarPlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(canViewOthers ? '' : currentUser.id);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'moco'>('calendar');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    description: '',
    userId: currentUser.id
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Wochentage-Header
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Bestimme den ersten Tag der Woche (Montag = 0)
  const startDay = (monthStart.getDay() + 6) % 7;
  const emptyDays = Array(startDay).fill(null);

  useEffect(() => {
    loadAbsences();
  }, [currentDate, selectedUserId]);

  const loadAbsences = async () => {
    setLoading(true);
    try {
      const start = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
      const end = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
      
      let url = `/api/absences?startDate=${start}&endDate=${end}`;
      if (selectedUserId) {
        url += `&userId=${selectedUserId}`;
      }
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAbsences(data);
      }
    } catch (error) {
      console.error('Error loading absences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAbsence = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error('Bitte alle Pflichtfelder ausfüllen');
      return;
    }

    try {
      const res = await fetch('/api/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Abwesenheit eingetragen');
        setShowModal(false);
        resetForm();
        loadAbsences();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      toast.error('Fehler beim Speichern');
    }
  };

  const handleDeleteAbsence = async (id: string) => {
    if (!confirm('Abwesenheit wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/absences?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Abwesenheit gelöscht');
        loadAbsences();
      } else {
        toast.error('Fehler beim Löschen');
      }
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'vacation',
      startDate: '',
      endDate: '',
      description: '',
      userId: currentUser.id
    });
  };

  const openModalForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    setSelectedDate(date);
    setFormData({
      ...formData,
      startDate: dateStr,
      endDate: dateStr,
      title: ABSENCE_TYPES[0].label
    });
    setShowModal(true);
  };

  const getAbsencesForDay = (day: Date): Absence[] => {
    return absences.filter(absence => {
      const start = parseISO(absence.startDate.split('T')[0]);
      const end = parseISO(absence.endDate.split('T')[0]);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const getTypeInfo = (type: string) => {
    return ABSENCE_TYPES.find(t => t.value === type) || ABSENCE_TYPES[3];
  };

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kalenderplanung</h1>
              <p className="text-sm sm:text-base text-gray-600">Ferien, Workshops & Abwesenheiten planen</p>
            </div>
          </div>

          {activeTab === 'calendar' && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-shadow"
            >
              <Plus className="w-5 h-5" />
              Abwesenheit eintragen
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white rounded-xl p-1.5 shadow-md">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'calendar'
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="hidden sm:inline">Kalender</span>
          </button>
          <button
            onClick={() => setActiveTab('moco')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'moco'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Link2 className="w-5 h-5" />
            <span className="hidden sm:inline">Integration MOCO</span>
            <span className="sm:hidden">MOCO</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'moco' ? (
          <MocoIntegration />
        ) : (
          <>
            {/* Filter */}
            {canViewOthers && teamMembers.length > 1 && (
              <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Mitarbeiter filtern
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Alle Mitarbeiter</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Kalender */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Kalender Header */}
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {format(currentDate, 'MMMM yyyy', { locale: de })}
                </h2>
                <button
                  onClick={goToToday}
                  className="text-sm text-white/80 hover:text-white"
                >
                  Heute
                </button>
              </div>

              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Wochentage */}
          <div className="grid grid-cols-7 bg-gray-50 border-b">
            {weekDays.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                {day}
              </div>
            ))}
          </div>

          {/* Kalender Grid */}
          <div className="grid grid-cols-7">
            {/* Leere Tage vor dem Monatsbeginn */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="min-h-[100px] sm:min-h-[120px] p-1 bg-gray-50 border-b border-r"></div>
            ))}

            {/* Tage des Monats */}
            {daysInMonth.map((day, index) => {
              const dayAbsences = getAbsencesForDay(day);
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => openModalForDate(day)}
                  className={`min-h-[100px] sm:min-h-[120px] p-1 border-b border-r cursor-pointer hover:bg-blue-50 transition-colors ${
                    isWeekend ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-500 text-white' : 'text-gray-700'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Abwesenheiten */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayAbsences.slice(0, 3).map((absence, i) => {
                      const typeInfo = getTypeInfo(absence.type);
                      return (
                        <div
                          key={absence.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate text-white"
                          style={{ backgroundColor: absence.color || typeInfo.color }}
                          title={`${absence.title} - ${absence.user.name || absence.user.email}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canViewOthers && (
                            <span className="font-medium">
                              {absence.user.name?.split(' ')[0] || absence.user.email.split('@')[0]}:
                            </span>
                          )}{' '}
                          {absence.title}
                        </div>
                      );
                    })}
                    {dayAbsences.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">+{dayAbsences.length - 3} mehr</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legende */}
        <div className="mt-6 bg-white rounded-xl shadow-md p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Legende</h3>
          <div className="flex flex-wrap gap-4">
            {ABSENCE_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <div key={type.value} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: type.color }}
                  ></div>
                  <Icon className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{type.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Aktuelle Abwesenheiten Liste */}
        {absences.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Eingetragene Abwesenheiten</h3>
            </div>
            <ul className="divide-y">
              {absences.map(absence => {
                const typeInfo = getTypeInfo(absence.type);
                const Icon = typeInfo.icon;
                const canDelete = isAdmin || absence.user.id === currentUser.id;

                return (
                  <li key={absence.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${absence.color}20` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: absence.color }} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{absence.title}</div>
                          <div className="text-sm text-gray-600">
                            {format(parseISO(absence.startDate), 'dd.MM.yyyy', { locale: de })}
                            {' - '}
                            {format(parseISO(absence.endDate), 'dd.MM.yyyy', { locale: de })}
                          </div>
                          {canViewOthers && (
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <User className="w-3 h-3" />
                              {absence.user.name || absence.user.email}
                            </div>
                          )}
                          {absence.description && (
                            <div className="text-sm text-gray-500 mt-1">{absence.description}</div>
                          )}
                        </div>
                      </div>

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteAbsence(absence.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
          </>
        )}
      </main>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Abwesenheit eintragen</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Typ */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Art der Abwesenheit</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const type = ABSENCE_TYPES.find(t => t.value === e.target.value);
                      setFormData({ 
                        ...formData, 
                        type: e.target.value,
                        title: type?.label || formData.title
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {ABSENCE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Titel */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="z.B. Sommerferien"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Zeitraum */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Von</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bis</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Mitarbeiter (nur für Admin/Koordinator) */}
                {canViewOthers && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Für Mitarbeiter</label>
                    <select
                      value={formData.userId}
                      onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {teamMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name || member.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Beschreibung */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    placeholder="Zusätzliche Informationen..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleCreateAbsence}
                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-shadow"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
