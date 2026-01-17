'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { H2 } from '../../ui/typography';
import { ExpandableListModal } from '../modals';
import { EmptyState } from '../../common';
import { LucideIcon, Maximize2 } from 'lucide-react';
import { ReactNode } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface JobListCardProps<T> {
  title: string;
  items: T[];
  itemCount?: number;
  badgeCount?: number;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClassName?: string;
  searchPlaceholder?: string;
  searchFields: (item: T) => string;
  filterOptions?: FilterOption[];
  onFilterChange?: (value: string) => T[];
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  showEmptyState?: boolean;
  className?: string;
  animationDelay?: number;
  scrollAreaClassName?: string;
  horizontalLayout?: boolean;
  itemWidth?: string;
  onNavigateToFullView?: () => void;
  useGridLayout?: boolean;
  onShowNestedView?: (show: (view: React.ReactNode, title: string) => void) => void;
}

export function JobListCard<T>({
  title,
  items,
  itemCount = 3,
  badgeCount,
  badgeVariant = 'outline',
  badgeClassName = '',
  searchPlaceholder = 'Search...',
  searchFields,
  filterOptions,
  onFilterChange,
  renderItem,
  emptyMessage = 'No items',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  showEmptyState = true,
  className = '',
  animationDelay = 0.5,
  scrollAreaClassName = '',
  horizontalLayout = false,
  itemWidth = '320px',
  onNavigateToFullView,
  useGridLayout = true,
  onShowNestedView,
}: JobListCardProps<T>) {
  const hasItems = items.length > 0;
  const [modalOpen, setModalOpen] = useState(false);
  const hasMore = itemCount ? items.length > itemCount : false;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay }}
      className={className}
    >
      <div className="relative bg-card rounded-2xl border border-border shadow-sm h-[600px] flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <H2 className="text-lg border-0">{title}</H2>
            <div className="flex items-center gap-2">
              {badgeCount !== undefined && (
                <Badge variant={badgeVariant} className={badgeClassName}>
                  {badgeCount} {badgeCount === 1 ? 'job' : 'jobs'}
                </Badge>
              )}
              {hasMore && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setModalOpen(true)}
                  className="h-8 w-8"
                  title={`View all ${items.length} items`}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4">
            {hasItems ? (
              <ExpandableListModal
                title={title}
                items={items}
                itemCount={itemCount}
                searchPlaceholder={searchPlaceholder}
                searchFields={searchFields}
                filterOptions={filterOptions}
                onFilterChange={onFilterChange}
                renderItem={renderItem}
                emptyMessage={emptyMessage}
                horizontalLayout={horizontalLayout}
                itemWidth={itemWidth}
                open={modalOpen}
                onOpenChange={setModalOpen}
                onNavigateToFullView={onNavigateToFullView}
                useGridLayout={useGridLayout}
                onShowNestedView={onShowNestedView}
              />
            ) : showEmptyState && emptyIcon ? (
              <EmptyState
                icon={emptyIcon}
                title={emptyTitle || emptyMessage}
                description={emptyDescription || ''}
              />
            ) : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

