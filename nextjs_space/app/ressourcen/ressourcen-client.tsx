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
  User as UserIcon
} from 'lucide-react';
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
  startOfDay,
  endOfDay
} from 'date-fns';
import { de } from 'date-fns/locale';

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

  // Woche berechnen
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Navigation
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Berechne Auslastung pro User
  const usersWithStats = useMemo(() => {
    return users.map(user => {
      const totalHours = user.assignedSubTasks.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );
      
      const targetHours = (user.weeklyHours * user.workloadPercent) / 100;
      const utilization = targetHours > 0 ? (totalHours / targetHours) * 100 : 0;
      
      // Tasks diese Woche
      const tasksThisWeek = user.assignedSubTasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= weekStart && dueDate <= weekEnd;
      });
      
      const hoursThisWeek = tasksThisWeek.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );

      return {
        ...user,
        totalHours,
        targetHours,
        utilization,
        tasksThisWeek,
        hoursThisWeek
      };
    });
  }, [users, weekStart, weekEnd]);

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

  // Gesamtstatistiken
  const totalStats = useMemo(() => {
    const totalUsers = usersWithStats.length;
    const overloaded = usersWithStats.filter(u => u.utilization > 100).length;
    const nearCapacity = usersWithStats.filter(u => u.utilization >= 80 && u.utilization <= 100).length;
    const available = usersWithStats.filter(u => u.utilization < 80).length;
    
    return { totalUsers, overloaded, nearCapacity, available };
  }, [usersWithStats]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-blue-600" />
              Ressourcenplanung
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Übersicht über Auslastung und Verfügbarkeit
            </p>
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

        {/* Wochen-Navigation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Wochenübersicht
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={prevWeek} variant="outline" size="sm">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button onClick={goToToday} variant="outline" size="sm">
                  Heute
                </Button>
                <Button onClick={nextWeek} variant="outline" size="sm">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {format(weekStart, 'd. MMM', { locale: de })} - {format(weekEnd, 'd. MMM yyyy', { locale: de })}
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
              {displayedUsers.map((user, index) => (
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
                          {user.workloadPercent}% Pensum • {user.targetHours}h/Woche
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getUtilizationColor(user.utilization)}`}>
                        {Math.round(user.utilization)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.totalHours}h von {user.targetHours}h
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <Progress 
                      value={Math.min(user.utilization, 100)} 
                      className="h-2"
                    />
                  </div>

                  {/* Wochenübersicht */}
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, dayIndex) => {
                      const dayTasks = user.assignedSubTasks.filter(task => {
                        if (!task.dueDate) return false;
                        return isSameDay(new Date(task.dueDate), day);
                      });
                      
                      const dayHours = dayTasks.reduce(
                        (sum, task) => sum + (task.estimatedHours || 0),
                        0
                      );
                      
                      const isToday = isSameDay(day, new Date());

                      return (
                        <div
                          key={dayIndex}
                          className={`text-center p-2 rounded-lg ${
                            isToday 
                              ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                              : 'bg-gray-50 dark:bg-gray-800'
                          }`}
                        >
                          <p className={`text-xs font-medium mb-1 ${
                            isToday ? 'text-blue-600' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {format(day, 'EEE', { locale: de })}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2">
                            {format(day, 'd.', { locale: de })}
                          </p>
                          
                          {dayTasks.length > 0 && (
                            <div className={`text-xs font-semibold px-2 py-1 rounded ${
                              dayHours > 8 
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                : dayHours > 6
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-600'
                            }`}>
                              {dayHours}h
                            </div>
                          )}
                          
                          {dayTasks.length > 0 && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                              {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Tasks dieser Woche */}
                  {user.tasksThisWeek.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Tasks diese Woche ({user.tasksThisWeek.length})
                      </h5>
                      <div className="space-y-2">
                        {user.tasksThisWeek.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className="text-xs flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {task.title}
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 truncate">
                                {task.ticket.title}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {task.estimatedHours && (
                                <span className="text-gray-600 dark:text-gray-400">
                                  {task.estimatedHours}h
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="text-gray-500 dark:text-gray-500">
                                  {format(new Date(task.dueDate), 'dd.MM.', { locale: de })}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {user.tasksThisWeek.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{user.tasksThisWeek.length - 3} weitere Tasks
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
