'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Clock, Calendar, User, Filter, ExternalLink, Users, BarChart3, TrendingUp, X, Plus, CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { Session } from 'next-auth';
import { useSearchParams, useRouter } from 'next/navigation';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | Date | null;
  estimatedHours: number | null;
  ticket: {
    id: string;
    title: string;
  };
  assignee: { id: string; name: string | null; email: string } | null;
}

interface TeamBreakdown {
  teamId: string;
  teamName: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number };
    week: { assigned: number; capacity: number; percentage: number };
    month: { assigned: number; capacity: number; percentage: number };
  };
}

interface WorkloadData {
  userId: string;
  userName: string | null;
  userEmail: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number; absenceDays?: number };
    week: { assigned: number; capacity: number; percentage: number; absenceDays?: number };
    month: { assigned: number; capacity: number; percentage: number; absenceDays?: number };
  };
  teamBreakdown?: TeamBreakdown[];
}

interface CompareUser {
  userId: string;
  tasks: Task[];
}

interface TasksClientProps {
  session: Session;
  initialTasks: Task[];
  currentUser: { id: string; role: string | null; teamId: string | null; name: string | null; email: string };
  teamMembers: { id: string; name: string | null; email: string }[];
  canViewOthers: boolean;
}

export function TasksClient({ session, initialTasks, currentUser, teamMembers, canViewOthers }: TasksClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedUserId, setSelectedUserId] = useState<string>(searchParams.get('user') || currentUser.id);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>(searchParams.get('filter') as any || 'all');
  const [loading, setLoading] = useState(false);
  
  // Multi-Vergleichsmodus
  const [compareMode, setCompareMode] = useState(false);
  const [compareUsers, setCompareUsers] = useState<CompareUser[]>([]);
  
  // Auslastung
  const [workloadPeriod, setWorkloadPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [workloadData, setWorkloadData] = useState<Record<string, WorkloadData>>({});
  
  // Zeitfilter
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'custom'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Load tasks when user or filter changes
  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tasks?userId=${selectedUserId}&filter=${filter}`);
        if (response.ok) {
          const data = await response.json();
          setTasks(data);
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [selectedUserId, filter]);

  // Load tasks for all compare users when filter changes
  useEffect(() => {
    const loadAllCompareTasks = async () => {
      if (!compareMode || compareUsers.length === 0) return;
      
      const updatedUsers = await Promise.all(
        compareUsers.map(async (cu) => {
          try {
            const response = await fetch(`/api/tasks?userId=${cu.userId}&filter=${filter}`);
            if (response.ok) {
              const data = await response.json();
              return { ...cu, tasks: data };
            }
          } catch (error) {
            console.error('Error loading tasks for user:', cu.userId, error);
          }
          return cu;
        })
      );
      setCompareUsers(updatedUsers);
    };

    loadAllCompareTasks();
  }, [filter, compareMode]);

  // Add user to comparison
  const addCompareUser = async (userId: string) => {
    if (compareUsers.some(cu => cu.userId === userId)) return;
    
    try {
      const response = await fetch(`/api/tasks?userId=${userId}&filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setCompareUsers([...compareUsers, { userId, tasks: data }]);
      }
    } catch (error) {
      console.error('Error adding compare user:', error);
    }
  };

  // Remove user from comparison
  const removeCompareUser = (userId: string) => {
    setCompareUsers(compareUsers.filter(cu => cu.userId !== userId));
  };

  // Load workload data
  useEffect(() => {
    const loadWorkload = async () => {
      if (!canViewOthers || teamMembers.length === 0) return;
      
      try {
        const userIds = teamMembers.map(m => m.id).join(',');
        const response = await fetch(`/api/workload?userIds=${userIds}`);
        if (response.ok) {
          const data: WorkloadData[] = await response.json();
          const mapped: Record<string, WorkloadData> = {};
          data.forEach(w => { mapped[w.userId] = w; });
          setWorkloadData(mapped);
        }
      } catch (error) {
        console.error('Error loading workload:', error);
      }
    };

    loadWorkload();
  }, [canViewOthers, teamMembers]);

  const toggleTask = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/subtasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (response.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId ? { ...t, completed: !completed } : t
        ));
        // Update compare users tasks too
        setCompareUsers(compareUsers.map(cu => ({
          ...cu,
          tasks: cu.tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t)
        })));
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  // Date filter helper
  const filterByDate = (taskList: Task[]) => {
    if (dateFilter === 'all') return taskList;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return taskList.filter(task => {
      // Tasks ohne Fälligkeitsdatum werden bei Zeitfiltern ausgeblendet
      if (!task.dueDate) return false;
      
      const taskDate = new Date(task.dueDate);
      taskDate.setHours(0, 0, 0, 0);
      
      if (dateFilter === 'today') {
        return taskDate.getTime() === today.getTime();
      }
      
      if (dateFilter === 'week') {
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        return taskDate >= today && taskDate <= weekEnd;
      }
      
      if (dateFilter === 'custom') {
        const from = dateFrom ? new Date(dateFrom) : null;
        const to = dateTo ? new Date(dateTo) : null;
        if (from) from.setHours(0, 0, 0, 0);
        if (to) to.setHours(23, 59, 59, 999);
        
        if (from && to) {
          return taskDate >= from && taskDate <= to;
        } else if (from) {
          return taskDate >= from;
        } else if (to) {
          return taskDate <= to;
        }
        // Wenn kein Datum gesetzt, alle mit Fälligkeitsdatum anzeigen
        return true;
      }
      
      return true;
    });
  };

  const openTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);
  const statusFilteredTasks = filter === 'open' ? openTasks : filter === 'done' ? doneTasks : tasks;
  const filteredTasks = filterByDate(statusFilteredTasks);

  // Helper to get filtered tasks for a compare user
  const getFilteredTasks = (userTasks: Task[]) => {
    const open = userTasks.filter(t => !t.completed);
    const done = userTasks.filter(t => t.completed);
    const statusFiltered = filter === 'open' ? open : filter === 'done' ? done : userTasks;
    return filterByDate(statusFiltered);
  };

  // Get available users for comparison (not already selected)
  const availableForComparison = teamMembers.filter(
    m => !compareUsers.some(cu => cu.userId === m.id)
  );

  const formatDate = (dateValue: string | Date | null) => {
    if (!dateValue) return null;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isOverdue = (dateValue: string | Date | null) => {
    if (!dateValue) return false;
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date < new Date();
  };

  const getWorkloadColor = (percentage: number) => {
    if (percentage <= 50) return 'bg-green-500';
    if (percentage <= 80) return 'bg-yellow-500';
    if (percentage <= 100) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getWorkloadLabel = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return 'Tag';
      case 'week': return 'Woche';
      case 'month': return 'Monat';
    }
  };

  const selectedUser = teamMembers.find(m => m.id === selectedUserId) || currentUser;
  
  const getUserById = (userId: string) => teamMembers.find(m => m.id === userId);

  const renderWorkloadBadge = (userId: string) => {
    const data = workloadData[userId];
    if (!data) return null;
    
    const periodData = data.periods[workloadPeriod];
    const percentage = periodData.percentage;
    
    return (
      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full text-white ${getWorkloadColor(percentage)}`}>
        {percentage}%
      </span>
    );
  };

  const renderTaskList = (taskList: Task[], title: string) => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {loading ? (
        <div className="p-8 text-center text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          Lade Tasks...
        </div>
      ) : taskList.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Keine Tasks gefunden</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {taskList.map((task, index) => (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                task.completed ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleTask(task.id, task.completed)}
                  className="mt-0.5 flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {task.completed ? (
                    <CheckSquare className="w-6 h-6 text-green-500" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400 hover:text-blue-500" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-medium ${
                      task.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                    <Link
                      href={`/tickets/${task.ticket.id}`}
                      className="hover:text-blue-600 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {task.ticket.title}
                    </Link>

                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${
                        isOverdue(task.dueDate) && !task.completed ? 'text-red-500 font-medium' : ''
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.dueDate)}
                      </span>
                    )}

                    {task.estimatedHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {task.estimatedHours}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderWorkloadCard = (userId: string) => {
    const data = workloadData[userId];
    if (!data) return null;
    
    const periodData = data.periods[workloadPeriod];
    const hasAbsence = periodData.absenceDays && periodData.absenceDays > 0;
    const hasMultipleTeams = data.teamBreakdown && data.teamBreakdown.length > 1;
    
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Auslastung ({getWorkloadLabel(workloadPeriod)})
          </h4>
          {!hasMultipleTeams && (
            <span className={`px-3 py-1 rounded-full text-white font-bold ${getWorkloadColor(periodData.percentage)}`}>
              {periodData.percentage}%
            </span>
          )}
        </div>
        
        {/* Abwesenheits-Hinweis */}
        {hasAbsence && (
          <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {periodData.absenceDays} {periodData.absenceDays === 1 ? 'Tag' : 'Tage'} abwesend (Ferien/Workshop)
            </p>
          </div>
        )}
        
        {/* Wenn mehrere Teams: Pro Team einen Balken anzeigen */}
        {hasMultipleTeams ? (
          <div className="space-y-4">
            {data.teamBreakdown!.map((team) => {
              const teamPeriodData = team.periods[workloadPeriod];
              return (
                <div key={team.teamId} className="border-l-4 border-purple-400 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{team.teamName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ${getWorkloadColor(teamPeriodData.percentage)}`}>
                      {teamPeriodData.percentage}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{teamPeriodData.assigned.toFixed(1)}h / {teamPeriodData.capacity.toFixed(1)}h</span>
                    <span>({team.workloadPercent}% • {team.availableHoursPerWeek.toFixed(1)}h/Wo)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getWorkloadColor(teamPeriodData.percentage)}`}
                      style={{ width: `${Math.min(teamPeriodData.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            
            {/* Gesamt-Zusammenfassung */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Gesamt</span>
                <span className={`px-2 py-0.5 rounded-full text-white text-xs font-bold ${getWorkloadColor(periodData.percentage)}`}>
                  {periodData.percentage}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {periodData.assigned.toFixed(1)}h / {periodData.capacity.toFixed(1)}h (Kapazität: {data.availableHoursPerWeek.toFixed(1)}h/Wo)
              </div>
            </div>
          </div>
        ) : (
          // Single Team oder kein Team: Standard-Anzeige
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Zugewiesen:</span>
              <span className="font-medium">{periodData.assigned.toFixed(1)}h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Kapazität:</span>
              <span className="font-medium">{periodData.capacity.toFixed(1)}h</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className={`h-2.5 rounded-full ${getWorkloadColor(periodData.percentage)}`}
                style={{ width: `${Math.min(periodData.percentage, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Kapazität: {data.availableHoursPerWeek.toFixed(1)}h/Woche
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Tasks Übersicht
          </h1>
          <p className="text-gray-600">
            {compareMode 
              ? `Vergleich: ${compareUsers.length} Mitarbeiter`
              : canViewOthers 
                ? `Alle Tasks von ${selectedUser.name || selectedUser.email}`
                : 'Alle deine zugewiesenen Tasks'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* User Filter (only for koordinator/admin, hidden in compare mode) */}
              {canViewOthers && teamMembers.length > 0 && !compareMode && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Benutzer {renderWorkloadBadge(selectedUserId)}
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.email} {workloadData[member.id] ? `(${workloadData[member.id].periods[workloadPeriod].percentage}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Status
                </label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle</option>
                  <option value="open">Offen</option>
                  <option value="done">Erledigt</option>
                </select>
              </div>

              {/* Zeitfilter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CalendarDays className="w-4 h-4 inline mr-1" />
                  Fälligkeit
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Alle Termine</option>
                  <option value="today">Heute fällig</option>
                  <option value="week">Diese Woche</option>
                  <option value="custom">Zeitraum wählen...</option>
                </select>
              </div>

              {/* Auslastungs-Zeitraum */}
              {canViewOthers && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <BarChart3 className="w-4 h-4 inline mr-1" />
                    Auslastung
                  </label>
                  <select
                    value={workloadPeriod}
                    onChange={(e) => setWorkloadPeriod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="day">Heute</option>
                    <option value="week">Diese Woche</option>
                    <option value="month">Dieser Monat</option>
                  </select>
                </div>
              )}
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-gray-100">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Von
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bis
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <div className="flex items-end">
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-red-600 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Zurücksetzen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Vergleichs-Toggle & User Selection */}
            {canViewOthers && teamMembers.length > 1 && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (compareMode) {
                      setCompareMode(false);
                      setCompareUsers([]);
                    } else {
                      setCompareMode(true);
                      // Add first two users by default
                      const firstTwo = teamMembers.slice(0, 2);
                      Promise.all(firstTwo.map(async (m) => {
                        const res = await fetch(`/api/tasks?userId=${m.id}&filter=${filter}`);
                        if (res.ok) {
                          const data = await res.json();
                          return { userId: m.id, tasks: data };
                        }
                        return { userId: m.id, tasks: [] };
                      })).then(setCompareUsers);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    compareMode 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  {compareMode ? 'Vergleich beenden' : 'Mitarbeiter vergleichen'}
                </button>

                {/* Multi-User Selection in Compare Mode */}
                {compareMode && (
                  <div className="space-y-2">
                    {/* Selected users chips */}
                    <div className="flex flex-wrap gap-2">
                      {compareUsers.map(cu => {
                        const user = getUserById(cu.userId);
                        return (
                          <span
                            key={cu.userId}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {user?.name || user?.email}
                            {renderWorkloadBadge(cu.userId)}
                            <button
                              onClick={() => removeCompareUser(cu.userId)}
                              className="ml-1 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    {/* Add more users */}
                    {availableForComparison.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              addCompareUser(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          defaultValue=""
                        >
                          <option value="">+ Mitarbeiter hinzufügen...</option>
                          {availableForComparison.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name || member.email} {workloadData[member.id] ? `(${workloadData[member.id].periods[workloadPeriod].percentage}%)` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vergleichsmodus: Multi-Spalten */}
        {compareMode && compareUsers.length > 0 ? (
          <>
            {/* Summary Table */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 overflow-x-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Übersicht</h3>
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Mitarbeiter</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Auslastung</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Gesamt</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Offen</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Erledigt</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-700">Stunden</th>
                  </tr>
                </thead>
                <tbody>
                  {compareUsers.map(cu => {
                    const user = getUserById(cu.userId);
                    const openCount = cu.tasks.filter(t => !t.completed).length;
                    const doneCount = cu.tasks.filter(t => t.completed).length;
                    const totalHours = cu.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
                    const workload = workloadData[cu.userId];
                    const percentage = workload?.periods[workloadPeriod].percentage || 0;
                    
                    return (
                      <tr key={cu.userId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                              {(user?.name || user?.email || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-medium">{user?.name || user?.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-white text-sm font-medium ${getWorkloadColor(percentage)}`}>
                            {percentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{cu.tasks.length}</td>
                        <td className="py-3 px-3 text-center font-bold text-orange-500">{openCount}</td>
                        <td className="py-3 px-3 text-center font-bold text-green-500">{doneCount}</td>
                        <td className="py-3 px-3 text-center text-gray-600">{totalHours.toFixed(1)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Multi-Column Grid */}
            <div className={`grid gap-6 ${
              compareUsers.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
              compareUsers.length === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
            }`}>
              {compareUsers.map(cu => {
                const user = getUserById(cu.userId);
                const userTasks = cu.tasks;
                const userOpenTasks = userTasks.filter(t => !t.completed);
                const userDoneTasks = userTasks.filter(t => t.completed);
                const userFilteredTasks = getFilteredTasks(userTasks);
                
                return (
                  <div key={cu.userId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {user?.name || user?.email}
                        {renderWorkloadBadge(cu.userId)}
                      </div>
                      <button
                        onClick={() => removeCompareUser(cu.userId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {renderWorkloadCard(cu.userId)}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-lg shadow p-3 text-center">
                        <p className="text-xl font-bold text-gray-900">{userTasks.length}</p>
                        <p className="text-xs text-gray-600">Gesamt</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-3 text-center">
                        <p className="text-xl font-bold text-orange-500">{userOpenTasks.length}</p>
                        <p className="text-xs text-gray-600">Offen</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-3 text-center">
                        <p className="text-xl font-bold text-green-500">{userDoneTasks.length}</p>
                        <p className="text-xs text-gray-600">Erledigt</p>
                      </div>
                    </div>
                    {renderTaskList(userFilteredTasks, 'Tasks')}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Normaler Modus */
          <>
            {/* Auslastungskarte für ausgewählten User */}
            {canViewOthers && (
              <div className="mb-6">
                {renderWorkloadCard(selectedUserId)}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-md p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
                <p className="text-sm text-gray-600">Gesamt</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 text-center">
                <p className="text-3xl font-bold text-orange-500">{openTasks.length}</p>
                <p className="text-sm text-gray-600">Offen</p>
              </div>
              <div className="bg-white rounded-xl shadow-md p-4 text-center">
                <p className="text-3xl font-bold text-green-500">{doneTasks.length}</p>
                <p className="text-sm text-gray-600">Erledigt</p>
              </div>
            </div>

            {/* Tasks List */}
            {renderTaskList(filteredTasks, 'Tasks')}
          </>
        )}
      </main>
    </div>
  );
}
