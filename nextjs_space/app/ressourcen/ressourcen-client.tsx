'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Calendar, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
  CalendarDays,
  CalendarRange
} from 'lucide-react';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfDay,
  eachWeekOfInterval
} from 'date-fns';
import { de } from 'date-fns/locale';

type ViewMode = 'today' | 'week' | 'month';

interface SubTask {
  id: string;
  title: string;
  estimatedHours: number | null;
  dueDate: Date | string | null;
  completed: boolean;
  ticket: {
    id: string;
    title: string;
    status: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  weeklyHours: number;
  workloadPercent: number;
  assignedSubTasks: SubTask[];
}

interface Project {
  id: string;
  title: string;
  status: string;
  priority: string;
  subTasks: {
    id: string;
    title: string;
    estimatedHours: number | null;
    dueDate: Date | string | null;
    assigneeId: string | null;
    assignee: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }[];
}

interface RessourcenClientProps {
  users: User[];
  projects: Project[];
}

export function RessourcenClient({ users, projects }: RessourcenClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  // Heute
  const today = startOfDay(new Date());

  // Woche berechnen
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Monat berechnen
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weeksInMonth = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 }
  );

  // Navigation basierend auf ViewMode
  const navigate = (direction: 'prev' | 'next') => {
    if (viewMode === 'today') {
      // Heute hat keine Navigation
      return;
    } else if (viewMode === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  };
  const goToToday = () => setCurrentDate(new Date());

  // Hilfsfunktion: Finde den nächsten Arbeitstag (Mo-Fr)
  const getNextWorkday = (date: Date): Date => {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    if (dayOfWeek === 0) { // Sonntag -> Montag
      result.setDate(result.getDate() + 1);
    } else if (dayOfWeek === 6) { // Samstag -> Montag
      result.setDate(result.getDate() + 2);
    }
    return result;
  };

  // Berechne Stunden pro Tag für einen SubTask
  const calculateHoursPerDay = (task: SubTask): { hoursPerDay: number; startDate: Date; endDate: Date; isOverdue: boolean } => {
    if (!task.dueDate || !task.estimatedHours) {
      return { hoursPerDay: 0, startDate: new Date(), endDate: new Date(), isOverdue: false };
    }
    
    const todayRaw = startOfDay(new Date());
    const dueDate = startOfDay(new Date(task.dueDate));
    
    // Wenn Task überfällig ist (dueDate liegt vor heute)
    const isOverdue = dueDate < todayRaw;
    
    if (isOverdue) {
      // Überfällige Tasks: Alle Stunden werden auf den NÄCHSTEN ARBEITSTAG verrechnet
      const nextWorkday = getNextWorkday(todayRaw);
      return { 
        hoursPerDay: task.estimatedHours, 
        startDate: nextWorkday, 
        endDate: nextWorkday,
        isOverdue: true 
      };
    }
    
    // Normale Tasks: Start ist der nächste Arbeitstag (falls heute Wochenende), Ende ist dueDate
    const startDate = getNextWorkday(todayRaw);
    const endDate = dueDate;
    
    // Wenn Start nach Ende liegt (z.B. Deadline ist heute Sonntag, nächster Arbeitstag Montag)
    if (startDate > endDate) {
      return { 
        hoursPerDay: task.estimatedHours, 
        startDate: startDate, 
        endDate: startDate,
        isOverdue: true 
      };
    }
    
    // Arbeitstage berechnen (Mo-Fr)
    let workDays = 0;
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Keine Wochenenden
        workDays++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    // Minimum 1 Tag um Division durch 0 zu vermeiden
    workDays = Math.max(workDays, 1);
    
    const hoursPerDay = task.estimatedHours / workDays;
    
    return { hoursPerDay, startDate, endDate, isOverdue: false };
  };

  // Berechne Stunden für eine bestimmte Woche
  const calculateWeeklyHoursForTask = (task: SubTask, weekStartDate: Date, weekEndDate: Date): number => {
    if (!task.dueDate || !task.estimatedHours) return 0;
    
    const { hoursPerDay, startDate, endDate } = calculateHoursPerDay(task);
    
    // Zähle Arbeitstage in dieser Woche, die auch im Task-Zeitraum liegen
    let hoursInWeek = 0;
    let current = startOfDay(new Date(weekStartDate));
    const weekEndNormalized = startOfDay(new Date(weekEndDate));
    const startDateNormalized = startOfDay(new Date(startDate));
    const endDateNormalized = startOfDay(new Date(endDate));
    
    while (current <= weekEndNormalized) {
      const dayOfWeek = current.getDay();
      // Nur Arbeitstage und nur wenn im Task-Zeitraum
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && current >= startDateNormalized && current <= endDateNormalized) {
        hoursInWeek += hoursPerDay;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return hoursInWeek;
  };

  // Berechne Stunden für einen bestimmten Tag
  const calculateDailyHoursForTask = (task: SubTask, day: Date): number => {
    if (!task.dueDate || !task.estimatedHours) return 0;
    
    const dayNormalized = startOfDay(new Date(day));
    const dayOfWeek = dayNormalized.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 0; // Wochenende
    
    const { hoursPerDay, startDate, endDate } = calculateHoursPerDay(task);
    const startDateNormalized = startOfDay(new Date(startDate));
    const endDateNormalized = startOfDay(new Date(endDate));
    
    if (dayNormalized >= startDateNormalized && dayNormalized <= endDateNormalized) {
      return hoursPerDay;
    }
    return 0;
  };

  // Berechne Auslastung pro User
  const usersWithStats = useMemo(() => {
    return users.map(user => {
      // Verfügbare Stunden pro Woche (weeklyHours * workloadPercent)
      const targetHoursWeekly = (user.weeklyHours * user.workloadPercent) / 100;
      
      // Stunden pro Tag (5 Arbeitstage)
      const hoursPerDayAvailable = targetHoursWeekly / 5;

      // Stunden pro Monat (ca. 4.33 Wochen)
      const targetHoursMonthly = targetHoursWeekly * 4.33;
      
      // Geplante Stunden für verschiedene Zeiträume
      let hoursToday = 0;
      let hoursThisWeek = 0;
      let hoursThisMonth = 0;
      
      const tasksToday: (SubTask & { hoursOnDay: number; hoursPerDay: number })[] = [];
      const tasksThisWeek: (SubTask & { hoursInWeek: number; hoursPerDay: number })[] = [];
      const tasksThisMonth: (SubTask & { hoursInMonth: number; hoursPerDay: number })[] = [];

      // Wochen im Monat mit ihren Stunden
      const weeklyBreakdown: { weekStart: Date; weekEnd: Date; hours: number; available: number }[] = [];
      
      weeksInMonth.forEach(ws => {
        const we = endOfWeek(ws, { weekStartsOn: 1 });
        let weekHours = 0;
        user.assignedSubTasks.forEach(task => {
          weekHours += calculateWeeklyHoursForTask(task, ws, we);
        });
        weeklyBreakdown.push({
          weekStart: ws,
          weekEnd: we,
          hours: weekHours,
          available: targetHoursWeekly
        });
      });
      
      user.assignedSubTasks.forEach(task => {
        // Heute
        const taskHoursToday = calculateDailyHoursForTask(task, today);
        if (taskHoursToday > 0) {
          const { hoursPerDay } = calculateHoursPerDay(task);
          tasksToday.push({
            ...task,
            hoursOnDay: taskHoursToday,
            hoursPerDay
          });
          hoursToday += taskHoursToday;
        }

        // Diese Woche
        const taskHoursThisWeek = calculateWeeklyHoursForTask(task, weekStart, weekEnd);
        if (taskHoursThisWeek > 0) {
          const { hoursPerDay } = calculateHoursPerDay(task);
          tasksThisWeek.push({
            ...task,
            hoursInWeek: taskHoursThisWeek,
            hoursPerDay
          });
          hoursThisWeek += taskHoursThisWeek;
        }

        // Dieser Monat
        const taskHoursThisMonth = calculateWeeklyHoursForTask(task, monthStart, monthEnd);
        if (taskHoursThisMonth > 0) {
          const { hoursPerDay } = calculateHoursPerDay(task);
          tasksThisMonth.push({
            ...task,
            hoursInMonth: taskHoursThisMonth,
            hoursPerDay
          });
          hoursThisMonth += taskHoursThisMonth;
        }
      });
      
      // Gesamtstunden aller offenen Tasks
      const totalHours = user.assignedSubTasks.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );
      
      // Auslastung basierend auf ViewMode
      const utilizationToday = hoursPerDayAvailable > 0 ? (hoursToday / hoursPerDayAvailable) * 100 : 0;
      const utilizationWeek = targetHoursWeekly > 0 ? (hoursThisWeek / targetHoursWeekly) * 100 : 0;
      const utilizationMonth = targetHoursMonthly > 0 ? (hoursThisMonth / targetHoursMonthly) * 100 : 0;

      return {
        ...user,
        totalHours,
        targetHoursWeekly,
        targetHoursMonthly,
        hoursPerDayAvailable,
        // Heute
        hoursToday,
        utilizationToday,
        tasksToday,
        // Woche
        hoursThisWeek,
        utilizationWeek,
        tasksThisWeek,
        // Monat
        hoursThisMonth,
        utilizationMonth,
        tasksThisMonth,
        weeklyBreakdown
      };
    });
  }, [users, today, weekStart, weekEnd, monthStart, monthEnd, weeksInMonth]);

  // Gefilterte User
  const displayedUsers = selectedUser 
    ? usersWithStats.filter(u => u.id === selectedUser)
    : usersWithStats;

  // Auslastungs-Farbe
  const getUtilizationColor = (utilization: number) => {
    if (utilization < 50) return 'text-green-600';
    if (utilization < 80) return 'text-blue-600';
    if (utilization < 100) return 'text-orange-600';
    return 'text-red-600';
  };

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization < 50) return 'bg-green-100 dark:bg-green-900/30';
    if (utilization < 80) return 'bg-blue-100 dark:bg-blue-900/30';
    if (utilization < 100) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Gesamtstatistiken basierend auf ViewMode
  const totalStats = useMemo(() => {
    const totalUsers = usersWithStats.length;
    
    const getUtilization = (u: typeof usersWithStats[0]) => {
      if (viewMode === 'today') return u.utilizationToday;
      if (viewMode === 'month') return u.utilizationMonth;
      return u.utilizationWeek;
    };
    
    const overloaded = usersWithStats.filter(u => getUtilization(u) > 100).length;
    const nearCapacity = usersWithStats.filter(u => getUtilization(u) >= 80 && getUtilization(u) <= 100).length;
    const available = usersWithStats.filter(u => getUtilization(u) < 80).length;
    
    return { totalUsers, overloaded, nearCapacity, available };
  }, [usersWithStats, viewMode]);

  // Zeitraum-Label basierend auf ViewMode
  const getPeriodLabel = () => {
    if (viewMode === 'today') {
      return format(today, 'EEEE, d. MMMM yyyy', { locale: de });
    } else if (viewMode === 'week') {
      return `${format(weekStart, 'd. MMM', { locale: de })} - ${format(weekEnd, 'd. MMM yyyy', { locale: de })}`;
    } else {
      return format(monthStart, 'MMMM yyyy', { locale: de });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
              Ressourcenplanung
            </h1>
            <p className="text-gray-600 mt-1">{getPeriodLabel()}</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <Button
              variant={viewMode === 'today' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => { setViewMode('today'); setCurrentDate(new Date()); }}
              className={viewMode === 'today' ? 'bg-blue-600 text-white' : ''}
            >
              <Clock className="w-4 h-4 mr-1" />
              Heute
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-blue-600 text-white' : ''}
            >
              <CalendarDays className="w-4 h-4 mr-1" />
              Woche
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className={viewMode === 'month' ? 'bg-blue-600 text-white' : ''}
            >
              <CalendarRange className="w-4 h-4 mr-1" />
              Monat
            </Button>
          </div>
        </motion.div>

        {/* Gesamtstatistiken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {totalStats.totalUsers}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Personen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {totalStats.available}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Verfügbar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {totalStats.nearCapacity}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Fast voll</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {totalStats.overloaded}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Überlastet</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Navigation Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                {viewMode === 'today' && 'Tagesübersicht'}
                {viewMode === 'week' && 'Wochenübersicht'}
                {viewMode === 'month' && 'Monatsübersicht'}
              </CardTitle>
              {viewMode !== 'today' && (
                <div className="flex items-center gap-2">
                  <Button onClick={() => navigate('prev')} variant="outline" size="sm">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button onClick={goToToday} variant="outline" size="sm">
                    Heute
                  </Button>
                  <Button onClick={() => navigate('next')} variant="outline" size="sm">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {getPeriodLabel()}
            </p>
          </CardHeader>
          <CardContent>
            {/* User-Filter */}
            <div className="mb-4">
              <select
                value={selectedUser || 'all'}
                onChange={(e) => setSelectedUser(e.target.value === 'all' ? null : e.target.value)}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">Alle Personen</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Auslastungs-Timeline */}
            <div className="space-y-4">
              {displayedUsers.map((user, index) => {
                // Werte basierend auf ViewMode
                const currentUtilization = viewMode === 'today' ? user.utilizationToday 
                  : viewMode === 'month' ? user.utilizationMonth 
                  : user.utilizationWeek;
                const currentHours = viewMode === 'today' ? user.hoursToday 
                  : viewMode === 'month' ? user.hoursThisMonth 
                  : user.hoursThisWeek;
                const targetHours = viewMode === 'today' ? user.hoursPerDayAvailable 
                  : viewMode === 'month' ? user.targetHoursMonthly 
                  : user.targetHoursWeekly;
                const periodLabel = viewMode === 'today' ? 'heute' 
                  : viewMode === 'month' ? 'diesen Monat' 
                  : 'diese Woche';
                const targetLabel = viewMode === 'today' ? '/Tag' 
                  : viewMode === 'month' ? '/Monat' 
                  : '/Woche';

                return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  {/* User Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {(user.name || user.email).substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {user.name || user.email}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.targetHoursWeekly.toFixed(1)}h/Woche • {user.hoursPerDayAvailable.toFixed(1)}h/Tag
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getUtilizationColor(currentUtilization)}`}>
                        {Math.round(currentUtilization)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {currentHours.toFixed(1)}h {periodLabel} / {targetHours.toFixed(1)}h{targetLabel}
                      </p>
                      {user.totalHours > 0 && (
                        <p className="text-[10px] text-gray-400">
                          ({user.totalHours}h Gesamt offen)
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress 
                      value={Math.min(currentUtilization, 100)} 
                      className="h-2"
                    />
                  </div>

                  {/* ===== HEUTE ANSICHT ===== */}
                  {viewMode === 'today' && (
                    <>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                              {format(today, 'EEEE, d. MMMM', { locale: de })}
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                              {user.tasksToday.length} {user.tasksToday.length === 1 ? 'Task' : 'Tasks'} geplant
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-blue-600">{user.hoursToday.toFixed(1)}h</p>
                            <p className="text-xs text-blue-500">von {user.hoursPerDayAvailable.toFixed(1)}h</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Tasks heute */}
                      {user.tasksToday.length > 0 ? (
                        <div className="space-y-2">
                          {user.tasksToday.map(task => (
                            <div key={task.id} className="text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-white">{task.title}</p>
                                  <p className="text-gray-500 dark:text-gray-400">{task.ticket.title}</p>
                                </div>
                                <div className="text-right ml-3">
                                  <span className="font-bold text-blue-600">{task.hoursOnDay.toFixed(1)}h</span>
                                  {task.dueDate && (
                                    <p className="text-[10px] text-gray-400">
                                      bis {format(new Date(task.dueDate), 'dd.MM.', { locale: de })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                          Keine Tasks für heute geplant
                        </p>
                      )}
                    </>
                  )}

                  {/* ===== WOCHEN ANSICHT ===== */}
                  {viewMode === 'week' && (
                    <>
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map((day, dayIndex) => {
                          const dayOfWeek = day.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          const isCurrentDay = isSameDay(day, new Date());
                          
                          let dayHours = 0;
                          let tasksOnDay = 0;
                          
                          user.assignedSubTasks.forEach(task => {
                            if (!task.dueDate || !task.estimatedHours || isWeekend) return;
                            const { hoursPerDay, startDate, endDate } = calculateHoursPerDay(task);
                            if (day >= startDate && day <= endDate) {
                              dayHours += hoursPerDay;
                              tasksOnDay++;
                            }
                          });
                          
                          const availableHours = isWeekend ? 0 : user.hoursPerDayAvailable;
                          const utilizationPercent = availableHours > 0 ? (dayHours / availableHours) * 100 : 0;

                          return (
                            <div
                              key={dayIndex}
                              className={`text-center p-2 rounded-lg ${
                                isWeekend 
                                  ? 'bg-gray-100 dark:bg-gray-800/50 opacity-50'
                                  : isCurrentDay 
                                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                  : 'bg-gray-50 dark:bg-gray-800'
                              }`}
                            >
                              <p className={`text-xs font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                {format(day, 'EEE', { locale: de })}
                              </p>
                              <p className="text-[10px] text-gray-500 mb-2">{format(day, 'd.', { locale: de })}</p>
                              
                              {!isWeekend && (
                                <>
                                  <div className={`text-xs font-semibold px-2 py-1 rounded ${
                                    utilizationPercent > 100 ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                    : utilizationPercent > 80 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                                    : utilizationPercent > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                  }`}>
                                    {dayHours > 0 ? `${dayHours.toFixed(1)}h` : '-'}
                                  </div>
                                  {tasksOnDay > 0 && (
                                    <p className="text-[10px] text-gray-500 mt-1">{tasksOnDay} Tasks</p>
                                  )}
                                  <p className="text-[9px] text-gray-400 mt-0.5">/{availableHours.toFixed(1)}h</p>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tasks diese Woche */}
                      {user.tasksThisWeek.length > 0 && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Tasks diese Woche ({user.tasksThisWeek.length}) • {user.hoursThisWeek.toFixed(1)}h
                          </h5>
                          <div className="space-y-2">
                            {user.tasksThisWeek.slice(0, 5).map(task => (
                              <div key={task.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                                    <p className="text-gray-500 dark:text-gray-400 truncate">{task.ticket.title}</p>
                                  </div>
                                  {task.dueDate && (
                                    <span className="text-gray-500 ml-2">bis {format(new Date(task.dueDate), 'dd.MM.', { locale: de })}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px]">
                                  <span className="text-blue-600 font-medium">{task.hoursPerDay.toFixed(1)}h/Tag</span>
                                  <span className="text-purple-600 font-medium">{task.hoursInWeek.toFixed(1)}h diese Woche</span>
                                  <span className="text-gray-500">(Gesamt: {task.estimatedHours}h)</span>
                                </div>
                              </div>
                            ))}
                            {user.tasksThisWeek.length > 5 && (
                              <p className="text-xs text-gray-500 text-center">+{user.tasksThisWeek.length - 5} weitere</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ===== MONATS ANSICHT ===== */}
                  {viewMode === 'month' && (
                    <>
                      {/* Wochen-Balken */}
                      <div className="space-y-3 mb-4">
                        {user.weeklyBreakdown.map((week, weekIdx) => {
                          const weekUtil = week.available > 0 ? (week.hours / week.available) * 100 : 0;
                          return (
                            <div key={weekIdx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 dark:text-gray-400">
                                  KW {format(week.weekStart, 'w', { locale: de })}: {format(week.weekStart, 'd.', { locale: de })} - {format(week.weekEnd, 'd. MMM', { locale: de })}
                                </span>
                                <span className={`font-medium ${getUtilizationColor(weekUtil)}`}>
                                  {week.hours.toFixed(1)}h / {week.available.toFixed(1)}h ({Math.round(weekUtil)}%)
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                <div 
                                  className={`h-3 rounded-full transition-all ${
                                    weekUtil > 100 ? 'bg-red-500' 
                                    : weekUtil > 80 ? 'bg-orange-500' 
                                    : weekUtil > 0 ? 'bg-green-500' 
                                    : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${Math.min(weekUtil, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Tasks diesen Monat */}
                      {user.tasksThisMonth.length > 0 && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Tasks diesen Monat ({user.tasksThisMonth.length}) • {user.hoursThisMonth.toFixed(1)}h
                          </h5>
                          <div className="space-y-2">
                            {user.tasksThisMonth.slice(0, 8).map(task => (
                              <div key={task.id} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{task.title}</p>
                                    <p className="text-gray-500 dark:text-gray-400 truncate">{task.ticket.title}</p>
                                  </div>
                                  {task.dueDate && (
                                    <span className="text-gray-500 ml-2">bis {format(new Date(task.dueDate), 'dd.MM.', { locale: de })}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px]">
                                  <span className="text-purple-600 font-medium">{task.hoursInMonth.toFixed(1)}h diesen Monat</span>
                                  <span className="text-gray-500">(Gesamt: {task.estimatedHours}h)</span>
                                </div>
                              </div>
                            ))}
                            {user.tasksThisMonth.length > 8 && (
                              <p className="text-xs text-gray-500 text-center">+{user.tasksThisMonth.length - 8} weitere</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
