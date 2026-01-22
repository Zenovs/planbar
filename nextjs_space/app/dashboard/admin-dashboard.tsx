'use client';

import { motion } from 'framer-motion';
import { Header } from '@/components/header';
import {
  Users,
  FolderKanban,
  CheckSquare,
  UsersRound,
  TrendingUp,
  Clock,
  Shield,
  Activity,
  Server,
  Calendar,
  UserPlus,
  FolderPlus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AdminDashboardProps {
  stats: {
    users: {
      total: number;
      newThisMonth: number;
      newThisWeek: number;
      withTeam: number;
      recentLogins: number;
    };
    projects: {
      total: number;
      newThisMonth: number;
      newThisWeek: number;
      open: number;
      inProgress: number;
      done: number;
    };
    tasks: {
      total: number;
      open: number;
      completed: number;
    };
    teams: {
      total: number;
    };
    roleDistribution: { role: string; count: number }[];
  };
  recentProjects: any[];
  recentUsers: any[];
}

const APP_VERSION = '2.1.0';
const BUILD_DATE = '2026-01-22';

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600 font-medium">
                +{trend.value} {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colors[color]} shadow-lg`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: 'Admin',
    projektleiter: 'Projektleiter',
    koordinator: 'Koordinator',
    member: 'Mitglied',
  };
  return labels[role] || role;
}

export function AdminDashboard({ stats, recentProjects, recentUsers }: AdminDashboardProps) {
  const taskCompletionRate = stats.tasks.total > 0 
    ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) 
    : 0;

  const projectCompletionRate = stats.projects.total > 0
    ? Math.round((stats.projects.done / stats.projects.total) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500">Systemübersicht und Statistiken</p>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            title="Benutzer"
            value={stats.users.total}
            subtitle={`${stats.users.withTeam} in Teams`}
            icon={Users}
            trend={{ value: stats.users.newThisWeek, label: 'diese Woche' }}
            color="blue"
          />
          <StatCard
            title="Projekte"
            value={stats.projects.total}
            subtitle={`${stats.projects.open} offen`}
            icon={FolderKanban}
            trend={{ value: stats.projects.newThisWeek, label: 'diese Woche' }}
            color="purple"
          />
          <StatCard
            title="Tasks"
            value={stats.tasks.total}
            subtitle={`${stats.tasks.open} offen`}
            icon={CheckSquare}
            color="green"
          />
          <StatCard
            title="Teams"
            value={stats.teams.total}
            icon={UsersRound}
            color="orange"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Project Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Projekt-Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Offen</span>
                <span className="font-semibold text-gray-900">{stats.projects.open}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${stats.projects.total > 0 ? (stats.projects.open / stats.projects.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">In Bearbeitung</span>
                <span className="font-semibold text-gray-900">{stats.projects.inProgress}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${stats.projects.total > 0 ? (stats.projects.inProgress / stats.projects.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Erledigt</span>
                <span className="font-semibold text-gray-900">{stats.projects.done}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${projectCompletionRate}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Task Completion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              Task-Fortschritt
            </h3>
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${taskCompletionRate * 2.51} 251`}
                    transform="rotate(-90 50 50)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">{taskCompletionRate}%</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.tasks.completed}</p>
                <p className="text-xs text-gray-500">Erledigt</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{stats.tasks.open}</p>
                <p className="text-xs text-gray-500">Offen</p>
              </div>
            </div>
          </motion.div>

          {/* User Roles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Benutzer-Rollen
            </h3>
            <div className="space-y-3">
              {stats.roleDistribution.map((role) => (
                <div key={role.role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{getRoleLabel(role.role)}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                    {role.count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Recent Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-purple-500" />
              Neue Projekte
            </h3>
            <div className="space-y-3">
              {recentProjects.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Projekte vorhanden</p>
              ) : (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{project.title}</p>
                      <p className="text-xs text-gray-500">
                        von {project.createdBy?.name || project.createdBy?.email}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(project.createdAt), 'dd.MM.', { locale: de })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-500" />
              Neue Benutzer
            </h3>
            <div className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-gray-500">Keine Benutzer vorhanden</p>
              ) : (
                recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-gray-500">{getRoleLabel(user.role)}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(new Date(user.createdAt), 'dd.MM.', { locale: de })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* System Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-gray-500" />
            System-Informationen
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Version</span>
              </div>
              <p className="text-xl font-bold text-blue-700">v{APP_VERSION}</p>
              <p className="text-xs text-blue-600">Build: {BUILD_DATE}</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Status</span>
              </div>
              <p className="text-xl font-bold text-green-700">Online</p>
              <p className="text-xs text-green-600">Alle Systeme aktiv</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Sicherheit</span>
              </div>
              <p className="text-xl font-bold text-purple-700">Geschützt</p>
              <p className="text-xs text-purple-600">NextAuth + bcrypt</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Aktivität</span>
              </div>
              <p className="text-xl font-bold text-orange-700">{stats.users.recentLogins}</p>
              <p className="text-xs text-orange-600">Aktive Nutzer (24h)</p>
            </div>
          </div>

          {/* Security Details */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Sicherheits-Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Passwort-Hashing (bcrypt)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">JWT Session-Token</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">HTTPS-Verschlüsselung</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Rollenbasierte Zugriffskontrolle</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">SQL-Injection Schutz (Prisma)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">XSS-Schutz (React)</span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
