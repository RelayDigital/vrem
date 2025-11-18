'use client';

import { motion } from 'framer-motion';
import { H2 } from '../../ui/typography';
import { MapPin } from 'lucide-react';
import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface MapCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  animationDelay?: number;
}

export function MapCard({ 
  title = 'Live Job Map', 
  children, 
  className = '',
  animationDelay = 0.4 
}: MapCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      className={`md:h-[600px] h-[90vh]${className}`}
    >
      <Card className="relative h-full bg-card rounded-2xl border border-border shadow-sm overflow-hidden gap-0">
        <CardHeader className="p-4 border-b border-border gap-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <H2 className="text-lg border-0">{title}</H2>
          </div>
        </CardHeader>
        <CardContent className="h-full p-0 pb-0!">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

