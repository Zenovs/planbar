'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, User, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, differenceInDays, addDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';

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

  // Berechne Projektstart und -ende
  const projectStart = projectCreatedAt ? startOfDay(new Date(projectCreatedAt)) : startOfDay(new Date());
  const firstTaskDate = startOfDay(new Date(sortedTasks[0].dueDate!));
  const lastTaskDate = endOfDay(new Date(sortedTasks[sortedTasks.length - 1].dueDate!));
  
  // Verwende frühestes Datum (Projektstart oder erste Task)
  const timelineStart = isBefore(projectStart, firstTaskDate) ? projectStart : firstTaskDate;
  const timelineEnd = lastTaskDate;
  
  // Füge 10% Padding hinzu
  const totalDays = differenceInDays(timelineEnd, timelineStart);
  const paddingDays = Math.max(2, Math.ceil(totalDays * 0.1));
  const displayStart = addDays(timelineStart, -paddingDays);
  const displayEnd = addDays(timelineEnd, paddingDays);
  const displayDuration = differenceInDays(displayEnd, displayStart);

  // Berechne Position auf Timeline (0-100%)
  const getTaskPosition = (date: Date) => {
    const taskDate = startOfDay(new Date(date));
    const daysSinceStart = differenceInDays(taskDate, displayStart);
    return (daysSinceStart / displayDuration) * 100;
  };

  // Heute-Marker Position
  const today = startOfDay(new Date());
  const todayPosition = getTaskPosition(today);
  const isTodayInRange = todayPosition >= 0 && todayPosition <= 100;

  // Status-Farbe
  const getStatusColor = (task: SubTask) => {
    if (task.completed) return 'bg-green-500';
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return 'bg-red-500'; // Überfällig
    if (differenceInDays(dueDate, today) <= 3) return 'bg-orange-500'; // Bald fällig
    return 'bg-blue-500'; // Normal
  };

  const getStatusBorder = (task: SubTask) => {
    if (task.completed) return 'border-green-600';
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return 'border-red-600';
    if (differenceInDays(dueDate, today) <= 3) return 'border-orange-600';
    return 'border-blue-600';
  };

  const getStatusIcon = (task: SubTask) => {
    if (task.completed) return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    const dueDate = new Date(task.dueDate!);
    if (isBefore(dueDate, today)) return <AlertCircle className="w-4 h-4 text-red-600" />;
    if (differenceInDays(dueDate, today) <= 3) return <AlertCircle className="w-4 h-4 text-orange-600" />;
    return <Circle className="w-4 h-4 text-blue-600" />;
  };

  // Generiere Zeitachsen-Marker
  const generateTimeMarkers = () => {
    const markers = [];
    const markerCount = Math.min(8, Math.max(4, Math.floor(displayDuration / 7))); // 4-8 Marker
    
    for (let i = 0; i <= markerCount; i++) {
      const markerDate = addDays(displayStart, Math.floor((displayDuration * i) / markerCount));
      const position = (i / markerCount) * 100;
      
      markers.push({
        date: markerDate,
        position,
        label: format(markerDate, 'd. MMM', { locale: de })
      });
    }
    
    return markers;
  };

  const timeMarkers = generateTimeMarkers();

  // Berechne Projekt-Statistiken
  const completedTasks = sortedTasks.filter(t => t.completed).length;
  const totalHours = sortedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const overdueTasks = sortedTasks.filter(t => !t.completed && isBefore(new Date(t.dueDate!), today)).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Projektzeitplan
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Visualisierung des Projektablaufs und aller Aufgaben
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

        {/* Timeline */}
        <div className="space-y-4">
          {/* Zeitachse mit Markern */}
          <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
            {/* Zeitmarker */}
            {timeMarkers.map((marker, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex flex-col items-center justify-center"
                style={{ left: `${marker.position}%` }}
              >
                <div className="w-px h-full bg-gray-300 dark:bg-gray-600" />
                <span className="absolute -bottom-6 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {marker.label}
                </span>
              </div>
            ))}

            {/* Heute-Marker */}
            {isTodayInRange && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${todayPosition}%` }}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Heute
                </div>
              </motion.div>
            )}
          </div>

          <div className="h-4" /> {/* Spacer für Zeitlabels */}

          {/* Tasks */}
          <div className="space-y-3">
            {sortedTasks.map((task, index) => {
              const position = getTaskPosition(new Date(task.dueDate!));
              const statusColor = getStatusColor(task);
              const statusBorder = getStatusBorder(task);
              const statusIcon = getStatusIcon(task);

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 + 0.3 }}
                  className="relative"
                >
                  {/* Task-Info */}
                  <div className="flex items-start gap-3 mb-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {statusIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-medium truncate ${
                        task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {task.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {task.assignee && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{task.assignee.name || task.assignee.email}</span>
                          </div>
                        )}
                        {task.estimatedHours !== null && task.estimatedHours !== undefined && task.estimatedHours > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{task.estimatedHours}h</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{format(new Date(task.dueDate!), 'd. MMMM yyyy', { locale: de })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline-Bar */}
                  <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {/* Task-Marker */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.4 }}
                      className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${statusColor} ${statusBorder}`}
                      style={{ left: `${position}%` }}
                    />
                    
                    {/* Verbindungslinie zum vorherigen Task */}
                    {index > 0 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: index * 0.05 + 0.5, duration: 0.5 }}
                        className="absolute top-1/2 transform -translate-y-1/2 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 origin-left"
                        style={{
                          left: `${getTaskPosition(new Date(sortedTasks[index - 1].dueDate!))}%`,
                          width: `${position - getTaskPosition(new Date(sortedTasks[index - 1].dueDate!))}%`
                        }}
                      />
                    )}
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
              <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-blue-600" />
              <span className="text-gray-600 dark:text-gray-400">In Planung</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-orange-600" />
              <span className="text-gray-600 dark:text-gray-400">Bald fällig (≤3 Tage)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600" />
              <span className="text-gray-600 dark:text-gray-400">Überfällig</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-green-600" />
              <span className="text-gray-600 dark:text-gray-400">Erledigt</span>
            </div>
            {isTodayInRange && (
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-4 bg-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Heute</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
