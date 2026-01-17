'use client';

import { ExpandableListModal } from '../modals';
import { EmptyState } from '../../common';
import { Button } from '../../ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface JobListSectionProps<T> {
  title: string;
  items: T[];
  itemCount?: number;
  searchPlaceholder?: string;
  searchFields: (item: T) => string;
  filterOptions?: FilterOption[];
  onFilterChange?: (value: string) => T[];
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  horizontalLayout?: boolean;
  itemWidth?: string;
  onNavigateToFullView?: () => void;
  useGridLayout?: boolean;
  onScrollControlsReady?: (scrollLeft: () => void, scrollRight: () => void) => void;
}

export function JobListSection<T>({
  title,
  items,
  itemCount = 6,
  searchPlaceholder = 'Search by address, client name...',
  searchFields,
  filterOptions,
  onFilterChange,
  renderItem,
  emptyMessage = 'No items',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className = '',
  horizontalLayout = false,
  itemWidth = '320px',
  onNavigateToFullView,
  useGridLayout = true,
  onScrollControlsReady,
}: JobListSectionProps<T>) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon!}
        title={emptyTitle || emptyMessage}
        description={emptyDescription || ''}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={className}>
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
        onNavigateToFullView={onNavigateToFullView}
        useGridLayout={useGridLayout}
        onScrollControlsReady={horizontalLayout ? onScrollControlsReady : undefined}
      />
    </div>
  );
}

