'use client';

import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Flag, Calendar, Check } from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  completed: boolean;
  color: string;
}

interface SharedTimelineViewProps {
  projectTitle: string;
  projectDescription: string | null;
  milestones: Milestone[];
  categoryName?: string;
  categoryColor?: string;
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
  categoryName,
  categoryColor,
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
          {categoryName && (
            <div className="mt-3">
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: categoryColor || '#6b7280' }}
              >
                {categoryName}
              </span>
            </div>
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
            <div className="relative py-8 min-w-[600px]">
              {/* Timeline Bar */}
              <div className="absolute left-4 right-4 top-1/2 h-4 bg-amber-700 rounded-full transform -translate-y-1/2" />
              
              {/* Milestone markers */}
              <div className="relative h-40">
                {sortedMilestones.map((milestone, index) => {
                  const position = getTimelinePosition(index);
                  const isAbove = index % 2 === 0;
                  
                  return (
                    <div
                      key={milestone.id}
                      className="absolute transform -translate-x-1/2"
                      style={{
                        left: `${Math.max(8, Math.min(92, position))}%`,
                        top: isAbove ? '0' : '50%',
                      }}
                    >
                      <div className={`flex flex-col items-center ${isAbove ? '' : 'flex-col-reverse'}`}>
                        {/* Content */}
                        <div className={`text-center max-w-[150px] ${isAbove ? 'mb-2' : 'mt-2'}`}>
                          <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                            {milestone.title}
                          </p>
                          <p className={`text-xs font-medium ${milestone.completed ? 'text-green-600' : 'text-gray-500'}`}>
                            {format(new Date(milestone.dueDate), 'dd. MMM yyyy', { locale: de })}
                          </p>
                        </div>
                        
                        {/* Connector line */}
                        <div className={`w-0.5 h-6 ${getColorClass(milestone.color)}`} />
                        
                        {/* Triangle marker */}
                        <div
                          className={`w-0 h-0
                            ${isAbove 
                              ? 'border-l-[12px] border-r-[12px] border-t-[16px] border-l-transparent border-r-transparent' 
                              : 'border-l-[12px] border-r-[12px] border-b-[16px] border-l-transparent border-r-transparent'
                            }
                            ${isAbove 
                              ? getBorderClass(milestone.color).replace('border-', 'border-t-')
                              : getBorderClass(milestone.color).replace('border-', 'border-b-')
                            }
                          `}
                        />
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

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Erstellt mit planbar</p>
        </div>
      </div>
    </div>
  );
}
