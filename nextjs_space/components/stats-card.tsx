'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  index?: number;
  href?: string;
}

export function StatsCard({ title, value, icon: Icon, color, index = 0, href }: StatsCardProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 50;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const content = (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mb-0.5 sm:mb-1 truncate">{title}</p>
        <p className="text-xl sm:text-3xl font-bold text-gray-900">{count}</p>
      </div>
      <div className={`${color} p-2.5 sm:p-4 rounded-lg sm:rounded-xl flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    </div>
  );

  const cardClasses = `bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-3 sm:p-6 border border-gray-100 ${href ? 'cursor-pointer hover:scale-[1.02]' : ''}`;

  if (href) {
    return (
      <Link href={href}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={cardClasses}
        >
          {content}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={cardClasses}
    >
      {content}
    </motion.div>
  );
}
