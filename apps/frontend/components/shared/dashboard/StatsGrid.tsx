'use client';

import { StatsCard } from './StatsCard';
import { LucideIcon } from 'lucide-react';

interface StatItem {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconBgColor?: string;
  iconColor?: string;
  valueSuffix?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ stats, columns = 4, className = '' }: StatsGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          iconBgColor={stat.iconBgColor}
          iconColor={stat.iconColor}
          valueSuffix={stat.valueSuffix}
        />
      ))}
    </div>
  );
}

