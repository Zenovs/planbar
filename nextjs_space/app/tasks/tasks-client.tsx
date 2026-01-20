'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Clock, Calendar, User, Filter, ExternalLink, Users, BarChart3, TrendingUp } from 'lucide-react';
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
    category: { name: string; color: string } | null;
  };
  assignee: { id: string; name: string | null; email: string } | null;
}

interface WorkloadData {
  userId: string;
  userName: string | null;
  userEmail: string;
  weeklyHours: number;
  workloadPercent: number;
  availableHoursPerWeek: number;
  periods: {
    day: { assigned: number; capacity: number; percentage: number };
    week: { assigned: number; capacity: number; percentage: number };
    month: { assigned: number; capacity: number; percentage: number };
  };
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
  
  // Vergleichsmodus
  const [compareMode, setCompareMode] = useState(false);
  const [compareUserId, setCompareUserId] = useState<string>('');
  const [compareTasks, setCompareTasks] = useState<Task[]>([]);
  
  // Auslastung
  const [workloadPeriod, setWorkloadPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [workloadData, setWorkloadData] = useState<Record<string, WorkloadData>>({});

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

  // Load compare tasks when compare user changes
  useEffect(() => {
    const loadCompareTasks = async () => {
      if (!compareMode || !compareUserId) {
        setCompareTasks([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/tasks?userId=${compareUserId}&filter=${filter}`);
        if (response.ok) {
          const data = await response.json();
          setCompareTasks(data);
        }
      } catch (error) {
        console.error('Error loading compare tasks:', error);
      }
    };

    loadCompareTasks();
  }, [compareUserId, filter, compareMode]);

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
        setCompareTasks(compareTasks.map(t => 
          t.id === taskId ? { ...t, completed: !completed } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const openTasks = tasks.filter(t => !t.completed);
  const doneTasks = tasks.filter(t => t.completed);
  const filteredTasks = filter === 'open' ? openTasks : filter === 'done' ? doneTasks : tasks;

  const compareOpenTasks = compareTasks.filter(t => !t.completed);
  const compareDoneTasks = compareTasks.filter(t => t.completed);
  const filteredCompareTasks = filter === 'open' ? compareOpenTasks : filter === 'done' ? compareDoneTasks : compareTasks;

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
  const compareUser = teamMembers.find(m => m.id === compareUserId);

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
                    {task.ticket.category && (
                      <span
                        className="px-2 py-0.5 text-xs rounded-full text-white"
                        style={{ backgroundColor: task.ticket.category.color }}
                      >
                        {task.ticket.category.name}
                      </span>
                    )}
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
    
    return (
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Auslastung ({getWorkloadLabel(workloadPeriod)})
          </h4>
          <span className={`px-3 py-1 rounded-full text-white font-bold ${getWorkloadColor(periodData.percentage)}`}>
            {periodData.percentage}%
          </span>
        </div>
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
            Pensum: {data.workloadPercent}% ({data.availableHoursPerWeek.toFixed(1)}h/Woche)
          </div>
        </div>
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
              ? `Vergleich: ${selectedUser.name || selectedUser.email} vs. ${compareUser?.name || compareUser?.email || '...'}`
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
              {/* User Filter (only for koordinator/admin) */}
              {canViewOthers && teamMembers.length > 0 && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Benutzer {!compareMode && renderWorkloadBadge(selectedUserId)}
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

              {/* Compare User (nur im Vergleichsmodus) */}
              {compareMode && canViewOthers && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Users className="w-4 h-4 inline mr-1" />
                    Vergleichen mit {renderWorkloadBadge(compareUserId)}
                  </label>
                  <select
                    value={compareUserId}
                    onChange={(e) => setCompareUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Benutzer wählen...</option>
                    {teamMembers.filter(m => m.id !== selectedUserId).map(member => (
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
                  <option value="all">Alle ({tasks.length})</option>
                  <option value="open">Offen ({openTasks.length})</option>
                  <option value="done">Erledigt ({doneTasks.length})</option>
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

            {/* Vergleichs-Toggle */}
            {canViewOthers && teamMembers.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCompareMode(!compareMode);
                    if (!compareMode && teamMembers.length > 1) {
                      const firstOther = teamMembers.find(m => m.id !== selectedUserId);
                      setCompareUserId(firstOther?.id || '');
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
              </div>
            )}
          </div>
        </div>

        {/* Vergleichsmodus: Zwei Spalten mit Auslastung */}
        {compareMode && compareUserId ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Linke Spalte */}
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-900">
                {selectedUser.name || selectedUser.email}
              </div>
              {renderWorkloadCard(selectedUserId)}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{tasks.length}</p>
                  <p className="text-xs text-gray-600">Gesamt</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-orange-500">{openTasks.length}</p>
                  <p className="text-xs text-gray-600">Offen</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-green-500">{doneTasks.length}</p>
                  <p className="text-xs text-gray-600">Erledigt</p>
                </div>
              </div>
              {renderTaskList(filteredTasks, 'Tasks')}
            </div>

            {/* Rechte Spalte */}
            <div className="space-y-4">
              <div className="text-lg font-semibold text-gray-900">
                {compareUser?.name || compareUser?.email}
              </div>
              {renderWorkloadCard(compareUserId)}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{compareTasks.length}</p>
                  <p className="text-xs text-gray-600">Gesamt</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-orange-500">{compareOpenTasks.length}</p>
                  <p className="text-xs text-gray-600">Offen</p>
                </div>
                <div className="bg-white rounded-lg shadow p-3 text-center">
                  <p className="text-xl font-bold text-green-500">{compareDoneTasks.length}</p>
                  <p className="text-xs text-gray-600">Erledigt</p>
                </div>
              </div>
              {renderTaskList(filteredCompareTasks, 'Tasks')}
            </div>
          </div>
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
