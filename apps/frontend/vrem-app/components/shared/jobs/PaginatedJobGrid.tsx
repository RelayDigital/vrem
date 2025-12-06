'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '../../ui/pagination';
import { Search, Filter, ArrowUpDown, LucideIcon, List as ListIcon, LayoutGrid } from 'lucide-react';
import { H3, Muted, Small } from '../../ui/typography';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { ButtonGroup } from '@/components/ui/button-group';

interface FilterOption {
  label: string;
  value: string;
}

interface PaginatedJobGridProps<T> {
  items: T[];
  renderItem: (item: T, index?: number, viewMode?: 'grid' | 'list') => React.ReactNode;
  renderTableRow?: (item: T, index?: number) => React.ReactNode;
  onItemClick?: (item: T) => void;
  searchPlaceholder?: string;
  searchFields?: (item: T) => string;
  filterOptions?: FilterOption[];
  onFilterChange?: (value: string) => T[];
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  itemsPerPage?: number;
}

export function PaginatedJobGrid<T>({
  items,
  renderItem,
  renderTableRow,
  onItemClick,
  searchPlaceholder = 'Search...',
  searchFields,
  filterOptions = [],
  onFilterChange,
  emptyMessage = 'No items found',
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  itemsPerPage = 12,
}: PaginatedJobGridProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPageState, setItemsPerPageState] = useState<number>(itemsPerPage);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Sync itemsPerPageState when prop changes
  useEffect(() => {
    setItemsPerPageState(itemsPerPage);
  }, [itemsPerPage]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (searchQuery && searchFields) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const searchableText = searchFields(item).toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply custom filter if provided
    if (onFilterChange && selectedFilter !== 'all') {
      result = onFilterChange(selectedFilter);
      // Re-apply search after custom filter
      if (searchQuery && searchFields) {
        const query = searchQuery.toLowerCase();
        result = result.filter((item) => {
          const searchableText = searchFields(item).toLowerCase();
          return searchableText.includes(query);
        });
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      const itemA = a as any;
      const itemB = b as any;

      switch (sortBy) {
        case 'date-asc':
          // Sort by scheduledDate ascending (earliest first)
          if (itemA.scheduledDate && itemB.scheduledDate) {
            return new Date(itemA.scheduledDate).getTime() - new Date(itemB.scheduledDate).getTime();
          }
          if (itemA.scheduledDate) return -1;
          if (itemB.scheduledDate) return 1;
          return 0;
        case 'date-desc':
          // Sort by scheduledDate descending (latest first)
          if (itemA.scheduledDate && itemB.scheduledDate) {
            return new Date(itemB.scheduledDate).getTime() - new Date(itemA.scheduledDate).getTime();
          }
          if (itemA.scheduledDate) return -1;
          if (itemB.scheduledDate) return 1;
          return 0;
        case 'client-asc':
          // Sort by clientName A-Z
          if (itemA.clientName && itemB.clientName) {
            return itemA.clientName.localeCompare(itemB.clientName);
          }
          return 0;
        case 'client-desc':
          // Sort by clientName Z-A
          if (itemA.clientName && itemB.clientName) {
            return itemB.clientName.localeCompare(itemA.clientName);
          }
          return 0;
        case 'priority':
          // Sort by priority: urgent > rush > standard
          const priorityOrder: Record<string, number> = { urgent: 3, rush: 2, standard: 1 };
          const priorityA = priorityOrder[itemA.priority] || 0;
          const priorityB = priorityOrder[itemB.priority] || 0;
          return priorityB - priorityA;
        default:
          return 0;
      }
    });

    return result;
  }, [items, searchQuery, selectedFilter, sortBy, searchFields, onFilterChange]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPageState);
  const startIndex = (currentPage - 1) * itemsPerPageState;
  const endIndex = startIndex + itemsPerPageState;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPageState(Number(value));
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Search, Filter, and Sort Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 " />
          <Input
            type="text"
            variant="muted"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        {filterOptions.length > 0 && (
          <Select value={selectedFilter} onValueChange={handleFilterChange}>
            <SelectTrigger variant="muted" className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
              <Filter className="h-4 w-4 md:mr-2" />
              <SelectValue placeholder="All Items" className="hidden md:inline" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              {filterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger variant="muted" className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
            <ArrowUpDown className="h-4 w-4 md:mr-2" />
            <SelectValue placeholder="Sort" className="hidden md:inline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Date (Earliest)</SelectItem>
            <SelectItem value="date-desc">Date (Latest)</SelectItem>
            <SelectItem value="client-asc">Client (A-Z)</SelectItem>
            <SelectItem value="client-desc">Client (Z-A)</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
        {/* View Toggle */}
        <ButtonGroup className="flex items-center shrink-0">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'muted'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8 w-8 p-0"
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'muted'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8 w-8 p-0"
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
        </ButtonGroup>
      </div>

      {/* Results Count */}
      {filteredAndSortedItems.length > 0 && (
        <Small className="text-muted-foreground mb-4">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} jobs
        </Small>
      )}

      {/* Grid or List View */}
      {paginatedItems.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map((item, index) => (
              <div
                key={index}
                className="h-full flex"
                onClick={() => onItemClick?.(item)}
                role={onItemClick ? 'button' : undefined}
              >
                <div className="w-full">{renderItem(item, startIndex + index, 'grid')}</div>
              </div>
              ))}
            </div>
          ) : renderTableRow ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Media Types</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item, index) => (
                  <TableRow
                    key={index}
                    onClick={() => onItemClick?.(item)}
                    className={onItemClick ? 'cursor-pointer' : undefined}
                  >
                    {renderTableRow(item, startIndex + index)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item, index) => (
                <div
                  key={index}
                  className="w-full"
                  onClick={() => onItemClick?.(item)}
                  role={onItemClick ? 'button' : undefined}
                >
                  {renderItem(item, startIndex + index, 'list')}
              </div>
            ))}
          </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between gap-4">
            {totalPages > 1 ? (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>

                {getPageNumbers().map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            ) : (
              <div></div>
            )}
            <Select value={itemsPerPageState.toString()} onValueChange={handleItemsPerPageChange}>
              <SelectTrigger className="w-10 md:w-[140px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
                <ListIcon className="h-4 w-4 md:mr-2" />
                <SelectValue placeholder="Per page" className="hidden md:inline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 per page</SelectItem>
                <SelectItem value="24">24 per page</SelectItem>
                <SelectItem value="48">48 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          {emptyIcon && (() => {
            const Icon = emptyIcon;
            return <Icon className="size-16 mx-auto mb-4 text-muted-foreground/40" />;
          })()}
          <H3 className="text-xl text-foreground mb-2">{emptyTitle || emptyMessage}</H3>
          <Muted className="mb-6">{emptyDescription}</Muted>
          {emptyAction && (
            <Button onClick={emptyAction.onClick}>
              {emptyAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
