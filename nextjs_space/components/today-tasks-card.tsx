'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, FolderOpen } from 'lucide-react';
import { SubTaskWithTicket } from '@/lib/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import Link from 'next/link';

interface TodayTasksCardProps {
  tasks: SubTaskWithTicket[];
}

export function TodayTasksCard({ tasks }: TodayTasksCardProps) {
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    setCompletingTasks(prev => new Set(prev).add(taskId));
    
    try {
      const response = await fetch(`/api/subtasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (response.ok) {
        // Reload page to update the list
        window.location.reload();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks heute</h2>
        </div>
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 sm:w-16 sm:h-16 text-green-400 mx-auto mb-4" />
          <p className="text-gray-500 text-sm sm:text-base">
            Keine Tasks für heute fällig! 🎉
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tasks heute</h2>
        </div>
        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
        </span>
      </div>

      <div className="space-y-3">
        {tasks.map((task, index) => {
          const isCompleting = completingTasks.has(task.id);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleTask(task.id, task.completed)}
                  disabled={isCompleting}
                  className="flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded min-h-[44px] min-w-[44px] flex items-center justify-center sm:min-h-0 sm:min-w-0"
                >
                  {isCompleting ? (
                    <Circle className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 hover:text-blue-500 transition-colors" />
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  {/* Task Title */}
                  <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 text-sm sm:text-base">
                    {task.title}
                  </h3>

                  {/* Projekt & Kategorie */}
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <Link 
                      href={`/tickets/${task.ticket.id}`}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-none">
                        {task.ticket.title}
                      </span>
                    </Link>

                    {task.estimatedHours && (
                      <span className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{task.estimatedHours}h</span>
                      </span>
                    )}
                  </div>

                  {/* Fälligkeitszeit */}
                  {task.dueDate && (
                    <div className="mt-1 text-xs text-orange-600 font-medium">
                      Fällig: {format(new Date(task.dueDate), 'HH:mm', { locale: de })} Uhr
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
