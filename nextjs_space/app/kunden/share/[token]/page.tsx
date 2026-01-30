'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Building2,
  Calendar,
  Layers,
  FolderOpen,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, differenceInDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  color: string;
  position: number;
  levelId: string;
  levelName: string;
  levelColor: string;
  team: { name: string; color: string } | null;
  dependsOnId: string | null;
  dependsOnName: string | null;
}

interface Level {
  id: string;
  name: string;
  color: string;
  position: number;
  projects: Project[];
}

interface Customer {
  name: string;
  description: string | null;
  color: string;
  organizationName: string;
  levels: Level[];
  projects: Project[];
}

const PROJECT_STATUS = [
  { value: 'planned', label: 'Geplant', color: 'bg-gray-500' },
  { value: 'in_progress', label: 'In Arbeit', color: 'bg-blue-500' },
  { value: 'review', label: 'Review', color: 'bg-yellow-500' },
  { value: 'completed', label: 'Abgeschlossen', color: 'bg-green-500' },
  { value: 'on_hold', label: 'Pausiert', color: 'bg-orange-500' },
];

export default function CustomerSharePage() {
  const params = useParams();
  const token = params.token as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineMonth, setTimelineMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('timeline');

  useEffect(() => {
    loadCustomer();
  }, [token]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/share?token=${token}`);
      const data = await res.json();
      
      if (res.ok) {
        setCustomer(data.customer);
      } else {
        setError(data.error || 'Nicht gefunden');
      }
    } catch (err) {
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const timelineDays = useMemo(() => {
    const start = startOfMonth(timelineMonth);
    const end = endOfMonth(timelineMonth);
    return eachDayOfInterval({ start, end });
  }, [timelineMonth]);

  const getProjectPosition = (project: Project) => {
    if (!project.startDate || !project.endDate) return null;
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    const monthStart = startOfMonth(timelineMonth);
    const monthEnd = endOfMonth(timelineMonth);

    if (end < monthStart || start > monthEnd) return null;

    const visibleStart = start < monthStart ? monthStart : start;
    const visibleEnd = end > monthEnd ? monthEnd : end;

    const startDay = differenceInDays(visibleStart, monthStart);
    const duration = differenceInDays(visibleEnd, visibleStart) + 1;

    return {
      left: `${(startDay / timelineDays.length) * 100}%`,
      width: `${(duration / timelineDays.length) * 100}%`,
    };
  };

  const getStatusInfo = (status: string) => {
    return PROJECT_STATUS.find(s => s.value === status) || PROJECT_STATUS[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nicht verfügbar</h2>
            <p className="text-gray-500">{error || 'Diese Seite ist nicht mehr verfügbar'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: customer.color }}
            >
              {customer.name[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              <p className="text-gray-500">Projektplanung • {customer.organizationName}</p>
            </div>
          </div>
          {customer.description && (
            <p className="mt-4 text-gray-600">{customer.description}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customer.levels.length}</p>
                <p className="text-xs text-gray-500">Phasen</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FolderOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{customer.projects.length}</p>
                <p className="text-xs text-gray-500">Projekte</p>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {customer.projects.filter(p => p.status === 'completed').length}
                </p>
                <p className="text-xs text-gray-500">Abgeschlossen</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid mb-6">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Zeitplanung
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Übersicht
            </TabsTrigger>
          </TabsList>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Zeitplanung</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(subMonths(timelineMonth, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-32 text-center">
                      {format(timelineMonth, 'MMMM yyyy', { locale: de })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(addMonths(timelineMonth, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimelineMonth(new Date())}
                    >
                      Heute
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {customer.projects.filter(p => p.startDate && p.endDate).length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Keine Projekte mit Zeitplanung</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Timeline Header */}
                      <div className="flex border-b">
                        <div className="w-48 flex-shrink-0 p-2 font-medium text-sm">Projekt</div>
                        <div className="flex-1 flex">
                          {timelineDays.map((day, i) => (
                            <div
                              key={i}
                              className={`flex-1 text-center text-xs p-1 border-l ${
                                isWeekend(day) ? 'bg-gray-100' : ''
                              }`}
                            >
                              <div className="font-medium">{format(day, 'd')}</div>
                              <div className="text-gray-400">{format(day, 'EEE', { locale: de })}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Timeline Rows by Level */}
                      {customer.levels.map((level) => (
                        <div key={level.id}>
                          {/* Level Header */}
                          <div className="flex bg-gray-50 border-b">
                            <div className="w-48 flex-shrink-0 p-2 font-medium text-sm flex items-center gap-2">
                              <div 
                                className="w-2 h-4 rounded"
                                style={{ backgroundColor: level.color }}
                              />
                              {level.name}
                            </div>
                            <div className="flex-1" />
                          </div>

                          {/* Projects */}
                          {level.projects.filter(p => p.startDate && p.endDate).map((project) => {
                            const position = getProjectPosition(project);
                            const statusInfo = getStatusInfo(project.status);
                            
                            return (
                              <div key={project.id} className="flex border-b hover:bg-gray-50">
                                <div className="w-48 flex-shrink-0 p-2 text-sm truncate flex items-center gap-2">
                                  <Users className="w-3 h-3 text-gray-400" />
                                  {project.name}
                                </div>
                                <div className="flex-1 relative h-10">
                                  {/* Grid lines */}
                                  <div className="absolute inset-0 flex">
                                    {timelineDays.map((day, i) => (
                                      <div
                                        key={i}
                                        className={`flex-1 border-l ${
                                          isWeekend(day) ? 'bg-gray-50' : ''
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  {/* Project bar */}
                                  {position && (
                                    <div
                                      className="absolute top-1 bottom-1 rounded"
                                      style={{
                                        left: position.left,
                                        width: position.width,
                                        backgroundColor: project.color,
                                      }}
                                      title={`${project.name}\n${format(new Date(project.startDate!), 'dd.MM.yyyy')} - ${format(new Date(project.endDate!), 'dd.MM.yyyy')}`}
                                    >
                                      <div className="px-2 py-1 text-xs text-white truncate">
                                        {project.name}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-4">
              {customer.levels.map((level) => (
                <Card key={level.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-8 rounded"
                        style={{ backgroundColor: level.color }}
                      />
                      <CardTitle className="text-lg">{level.name}</CardTitle>
                      <Badge variant="secondary">{level.projects.length} Projekte</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {level.projects.length === 0 ? (
                      <p className="text-gray-500 text-sm">Keine Projekte in dieser Phase</p>
                    ) : (
                      <div className="space-y-2">
                        {level.projects.map((project) => {
                          const statusInfo = getStatusInfo(project.status);
                          return (
                            <div
                              key={project.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2 h-8 rounded"
                                  style={{ backgroundColor: project.color }}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{project.name}</span>
                                    <Badge className={`${statusInfo.color} text-white text-xs`}>
                                      {statusInfo.label}
                                    </Badge>
                                    {project.team && (
                                      <Badge 
                                        variant="outline" 
                                        className="text-xs"
                                        style={{ borderColor: project.team.color, color: project.team.color }}
                                      >
                                        <Users className="w-3 h-3 mr-1" />
                                        {project.team.name}
                                      </Badge>
                                    )}
                                  </div>
                                  {project.startDate && project.endDate && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {format(new Date(project.startDate), 'dd.MM.yyyy')} - {format(new Date(project.endDate), 'dd.MM.yyyy')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          Projektplanung powered by planbar
        </div>
      </footer>
    </div>
  );
}
