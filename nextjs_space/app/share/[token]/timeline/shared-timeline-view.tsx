'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Flag, Calendar, Check, User, ArrowRight } from 'lucide-react';

interface DependsOn {
  id: string;
  title: string;
  dueDate: Date;
}

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  completed: boolean;
  color: string;
  responsibility: string | null;
  dependsOn: DependsOn | null;
}

interface SharedTimelineViewProps {
  projectTitle: string;
  projectDescription: string | null;
  milestones: Milestone[];
}

const getColorClass = (color: string) => {
  const colors: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
  };
  return colors[color] || 'bg-gray-500';
};

const getBorderClass = (color: string) => {
  const colors: Record<string, string> = {
    green: 'border-green-500',
    red: 'border-red-500',
    gray: 'border-gray-500',
    blue: 'border-blue-500',
    yellow: 'border-yellow-500',
  };
  return colors[color] || 'border-gray-500';
};

export function SharedTimelineView({
  projectTitle,
  projectDescription,
  milestones,
}: SharedTimelineViewProps) {
  const sortedMilestones = [...milestones].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const completedCount = milestones.filter((m) => m.completed).length;
  const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

  const getTimelinePosition = (index: number) => {
    if (sortedMilestones.length <= 1) return 50;
    return (index / (sortedMilestones.length - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <Flag className="w-8 h-8 text-amber-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {projectTitle}
            </h1>
          </div>
          {projectDescription && (
            <p className="text-gray-600 mt-2">{projectDescription}</p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Projektfortschritt</h2>
            <span className="text-2xl font-bold text-amber-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-amber-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {completedCount} von {milestones.length} Meilensteinen abgeschlossen
          </p>
        </div>

        {/* Timeline Visualization */}
        {milestones.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8 overflow-x-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Timeline</h2>
            <div className="relative py-12 px-4 min-w-[600px]">
              {/* Timeline Bar */}
              <div className="absolute left-4 right-4 top-1/2 h-2 bg-amber-600/80 rounded-full transform -translate-y-1/2 shadow-sm" />
              
              {/* Milestone markers - positioned ON the bar */}
              <div className="relative" style={{ minHeight: '120px' }}>
                {sortedMilestones.map((milestone, index) => {
                  const position = getTimelinePosition(index);
                  const isAbove = index % 2 === 0;
                  
                  return (
                    <div
                      key={milestone.id}
                      className="absolute"
                      style={{
                        left: `${Math.max(8, Math.min(92, position))}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {/* Circle marker ON the bar */}
                      <div
                        className={`w-4 h-4 rounded-full shadow-md border-2 border-white ${getColorClass(milestone.color)}`}
                      />
                      
                      {/* Label above or below */}
                      <div 
                        className={`absolute left-1/2 transform -translate-x-1/2 text-center max-w-[120px] ${
                          isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                        }`}
                      >
                        <p className="text-xs sm:text-sm font-medium text-gray-700 line-clamp-2 leading-tight">
                          {milestone.title}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500">
                          {format(new Date(milestone.dueDate), 'dd. MMM', { locale: de })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">Abgeschlossen</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">In Arbeit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <span className="text-sm text-gray-600">Geplant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">Kritisch</span>
              </div>
            </div>
          </div>
        )}

        {/* Milestone List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alle Meilensteine</h2>
          {milestones.length === 0 ? (
            <div className="text-center py-12">
              <Flag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Noch keine Meilensteine definiert</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border-l-4 bg-gray-50 ${getBorderClass(milestone.color)}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      milestone.completed ? 'bg-green-500 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {milestone.completed ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Calendar className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3
                      className={`font-semibold ${
                        milestone.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {format(new Date(milestone.dueDate), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </p>
                    
                    {/* Verantwortliche Instanz */}
                    {milestone.responsibility && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-600">Verantwortlich:</span>
                        <span className="font-medium text-blue-600">{milestone.responsibility}</span>
                      </div>
                    )}
                    
                    {/* Abhängigkeit */}
                    {milestone.dependsOn && (
                      <div className="flex items-center gap-1.5 mt-2 text-sm">
                        <ArrowRight className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-600">Abhängig von:</span>
                        <span className="font-medium text-amber-600">{milestone.dependsOn.title}</span>
                      </div>
                    )}
                    
                    {milestone.description && (
                      <p className="text-sm text-gray-600 mt-2">{milestone.description}</p>
                    )}
                  </div>
                  {milestone.completed && (
                    <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Erledigt
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>


      </div>
    </div>
  );
}
