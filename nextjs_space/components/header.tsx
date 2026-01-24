'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Ticket, LogOut, Users, LayoutDashboard, User, Settings, Sparkles, Menu, X, CalendarDays, CheckSquare, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Header() {
  const { data: session, status } = useSession() || {};
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (status === 'loading' || !session?.user) {
    return null;
  }

  const isAdmin = session?.user?.role === 'admin';
  const isMitglied = session?.user?.role === 'Mitglied';
  
  const navItems = [
    // Dashboard nur für Admins sichtbar
    ...(isAdmin ? [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] : []),
    { href: '/tasks', label: 'Tasks', icon: CheckSquare },
    { href: '/tickets', label: 'Projekte', icon: Ticket },
    // Team nicht für Mitglieder sichtbar
    ...(!isMitglied ? [{ href: '/team', label: 'Team', icon: Users }] : []),
    // Kalender nur für Admins sichtbar
    ...(isAdmin ? [{ href: '/kalenderplanung', label: 'Kalender', icon: CalendarDays }] : []),
    // Kosten nur für Admins sichtbar
    ...(isAdmin ? [{ href: '/kosten', label: 'Kosten', icon: Wallet }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link href={isAdmin ? '/dashboard' : '/tasks'} className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 sm:p-2 rounded-lg">
              <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                planbar
              </span>
              <span className="text-[8px] sm:text-[10px] text-gray-500 -mt-1 hidden xs:block">powered by wireon</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </motion.button>
                </Link>
              );
            })}
            
            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-all">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={session?.user?.image || undefined} />
                    <AvatarFallback>
                      {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:inline text-sm font-medium text-gray-700">
                    {session?.user?.name || 'Benutzer'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session?.user?.name || 'Benutzer'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" />
                    Profil bearbeiten
                  </Link>
                </DropdownMenuItem>
                {['admin', 'Administrator', 'ADMIN', 'projektleiter', 'Projektleiter'].includes(session?.user?.role || '') && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="w-4 h-4 mr-2" />
                      Einstellungen
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Abmelden
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Mobile: Avatar + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={session?.user?.image || undefined} />
              <AvatarFallback className="text-xs">
                {session?.user?.name?.[0]?.toUpperCase() || session?.user?.email?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-gray-200"
          >
            <nav className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all min-h-[48px] ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-base">{item.label}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-3 mt-3">
                <Link 
                  href="/profile" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 min-h-[48px]"
                >
                  <User className="w-5 h-5" />
                  <span className="text-base">Profil bearbeiten</span>
                </Link>
                {['admin', 'Administrator', 'ADMIN', 'projektleiter', 'Projektleiter'].includes(session?.user?.role || '') && (
                  <Link 
                    href="/settings" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 min-h-[48px]"
                  >
                    <Settings className="w-5 h-5" />
                    <span className="text-base">Einstellungen</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 min-h-[48px] text-left"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-base">Abmelden</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
