'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, User, CheckCircle2, Circle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, differenceInDays, addDays, startOfDay, endOfDay, isAfter, isBefore, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, getWeek, startOfMonth, endOfMonth, eachWeekOfInterval } from 'date-fns';
import { de } from 'date-fns/locale';
import { useState } from 'react';

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  assignee?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ProjectTimelineProps {
  projectTitle: string;
  subTasks: SubTask[];
  projectCreatedAt?: Date;
}

export function ProjectTimeline({ projectTitle, subTasks, projectCreatedAt }: ProjectTimelineProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filtere nur SubTasks mit Fälligkeitsdatum
  const tasksWithDates = subTasks.filter(task => task.dueDate);

  if (tasksWithDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Projektzeitplan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Keine Zeitplanung vorhanden
            </h3>
            <p className="text-sm text-gray-500 max-w-md">
              Fügen Sie Ihren Aufgaben Fälligkeitsdaten hinzu, um den Projektzeitplan zu visualisieren.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sortiere Tasks nach Datum
  const sortedTasks = [...tasksWithDates].sort((a, b) => {
    const dateA = new Date(a.dueDate!);
    const dateB = new Date(b.dueDate!);
    return dateA.getTime() - dateB.getTime();
  });

  const today = startOfDay(new Date());

  // Status-Funktionen
  const getStatusColor = (task: SubTask) => {
    if (task.completed) return 'bg-green-500';
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return 'bg-red-500';
    if (differenceInDays(dueDate, today) <= 3) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getStatusBorder = (task: SubTask) => {
    if (task.completed) return 'border-green-600';
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return 'border-red-600';
    if (differenceInDays(dueDate, today) <= 3) return 'border-orange-600';
    return 'border-blue-600';
  };

  const getStatusText = (task: SubTask) => {
    if (task.completed) return 'text-green-600';
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return 'text-red-600';
    if (differenceInDays(dueDate, today) <= 3) return 'text-orange-600';
    return 'text-blue-600';
  };

  const getStatusIcon = (task: SubTask) => {
    if (task.completed) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (differenceInDays(dueDate, today) <= 3) return <AlertCircle className="w-4 h-4 text-orange-600" />;
    return <Circle className="w-4 h-4 text-blue-600" />;
  };

  // Berechne Projekt-Statistiken
  const completedTasks = sortedTasks.filter(t => t.completed).length;
  const totalHours = sortedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const overdueTasks = sortedTasks.filter(t => !t.completed && isBefore(new Date(t.dueDate!), today)).length;

  // Berechne Monatsansicht
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Woche beginnt Montag
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });

  // Gruppiere Tasks nach Tag
  const tasksByDay = new Map<string, SubTask[]>();
  sortedTasks.forEach(task => {
    const dateKey = format(new Date(task.dueDate!), 'yyyy-MM-dd');
    if (!tasksByDay.has(dateKey)) {
      tasksByDay.set(dateKey, []);
    }
    tasksByDay.get(dateKey)!.push(task);
  });

  // Navigation
  const prevMonth = () => {
    setCurrentDate(addDays(currentDate, -30));
  };

  const nextMonth = () => {
    setCurrentDate(addDays(currentDate, 30));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Projektzeitplan
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={prevMonth} variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button onClick={goToToday} variant="outline" size="sm">
              Heute
            </Button>
            <Button onClick={nextMonth} variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {format(currentDate, 'MMMM yyyy', { locale: de })}
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {/* Statistiken */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Aufgaben</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{sortedTasks.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Erledigt</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Überfällig</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{overdueTasks}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Stunden</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{totalHours}h</p>
          </motion.div>
        </div>

        {/* Kalender-Ansicht */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {/* Wochentage-Header */}
          <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => (
              <div
                key={i}
                className="p-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Kalender-Tage */}
          <div className="grid grid-cols-7">
            {allDays.map((day, i) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDay.get(dateKey) || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.01 }}
                  className={`min-h-[100px] p-2 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 ${
                    !isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                  } ${
                    isToday ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Tageszahl */}
                  <div className={`text-xs font-medium mb-1 ${
                    isToday 
                      ? 'flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white' 
                      : !isCurrentMonth
                      ? 'text-gray-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Tasks für diesen Tag */}
                  <div className="space-y-1">
                    {dayTasks.map((task, taskIndex) => {
                      const statusColor = getStatusColor(task);
                      const statusText = getStatusText(task);

                      return (
                        <motion.div
                          key={task.id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.01 + taskIndex * 0.05 }}
                          className={`text-xs p-1.5 rounded ${
                            task.completed
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : isBefore(new Date(task.dueDate!), today)
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : differenceInDays(new Date(task.dueDate!), today) <= 3
                              ? 'bg-orange-100 dark:bg-orange-900/30'
                              : 'bg-blue-100 dark:bg-blue-900/30'
                          }`}
                        >
                          <div className="flex items-start gap-1">
                            <div className="flex-shrink-0 mt-0.5">
                              {task.completed ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              ) : (
                                <Circle className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`truncate font-medium ${
                                task.completed ? 'line-through text-gray-500' : statusText
                              }`}>
                                {task.title}
                              </p>
                              {task.assignee && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {task.assignee.name || task.assignee.email}
                                </p>
                              )}
                              {task.estimatedHours !== null && task.estimatedHours !== undefined && task.estimatedHours > 0 && (
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {task.estimatedHours}h
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Legende */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legende</h4>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-600 dark:text-gray-400">In Planung</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600 dark:text-gray-400">Bald fällig (≤3 Tage)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600 dark:text-gray-400">Überfällig</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600 dark:text-gray-400">Erledigt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px]">
                {format(today, 'd')}
              </div>
              <span className="text-gray-600 dark:text-gray-400">Heute</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
