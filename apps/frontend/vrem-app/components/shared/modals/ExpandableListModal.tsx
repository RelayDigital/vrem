'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { ScrollArea } from '../../ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Badge } from '../../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../ui/tooltip';
import { Maximize2, Search, Filter, X, ExternalLink, XIcon, ArrowUpDown, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface ExpandableListModalProps<T> {
  title: string;
  items: T[];
  renderItem: (item: T, index?: number) => React.ReactNode;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  onFilterChange?: (value: string) => T[];
  searchFields?: (item: T) => string; // Function to extract searchable text from item
  emptyMessage?: string;
  triggerButton?: React.ReactNode;
  itemCount?: number; // Show this many items before "View All"
  horizontalLayout?: boolean; // Display items in a horizontal scrollable row
  itemWidth?: string; // Width for horizontal layout items (e.g., "320px", "w-80")
  showInlineExpandButton?: boolean; // Show expand button below items (default: false)
  open?: boolean; // Controlled open state
  onOpenChange?: (open: boolean) => void; // Callback when modal opens/closes
  onNavigateToFullView?: () => void; // Callback to navigate to full jobs view
  useGridLayout?: boolean; // Use 3-column grid layout in modal (default: true)
  renderHeaderActions?: (scrollLeft: () => void, scrollRight: () => void) => React.ReactNode; // Render navigation buttons in header
  onScrollControlsReady?: (scrollLeft: () => void, scrollRight: () => void) => void; // Callback to expose scroll controls
  nestedView?: React.ReactNode; // Nested view to show instead of items (e.g., photographer rankings)
  nestedViewTitle?: string; // Title for nested view
  onNestedViewClose?: () => void; // Callback when nested view should close
  onShowNestedView?: (show: (view: React.ReactNode, title: string) => void) => void; // Callback to expose function to show nested view
}

export function ExpandableListModal<T>({
  title,
  items,
  renderItem,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  onFilterChange,
  searchFields,
  emptyMessage = 'No items found',
  triggerButton,
  itemCount,
  horizontalLayout = false,
  itemWidth = '320px',
  showInlineExpandButton = false,
  open: controlledOpen,
  onOpenChange,
  onNavigateToFullView,
  useGridLayout = true,
  renderHeaderActions,
  onScrollControlsReady,
  nestedView,
  nestedViewTitle,
  onNestedViewClose,
  onShowNestedView,
}: ExpandableListModalProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValue, setFilterValue] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [showNestedView, setShowNestedView] = useState(false);
  const [currentNestedView, setCurrentNestedView] = useState<React.ReactNode>(null);
  const [currentNestedViewTitle, setCurrentNestedViewTitle] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Expose function to show nested view
  const showNestedViewFn = useCallback((view: React.ReactNode, title: string) => {
    setCurrentNestedView(view);
    setCurrentNestedViewTitle(title);
    setShowNestedView(true);
  }, []);

  useEffect(() => {
    if (onShowNestedView) {
      onShowNestedView(showNestedViewFn);
    }
  }, [onShowNestedView, showNestedViewFn]);

  // Use controlled state if open prop is provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset nested view when modal closes
      setShowNestedView(false);
      setCurrentNestedView(null);
      setCurrentNestedViewTitle('');
    }
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  // Apply search filter
  let filteredItems = [...items];
  
  if (searchQuery && searchFields) {
    filteredItems = filteredItems.filter((item) =>
      searchFields(item).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply custom filter
  if (filterValue !== 'all' && onFilterChange) {
    filteredItems = onFilterChange(filterValue);
    // Re-apply search after custom filter
    if (searchQuery && searchFields) {
      filteredItems = filteredItems.filter((item) =>
        searchFields(item).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  }

  // Apply sorting
  filteredItems.sort((a, b) => {
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

  const displayItems = itemCount && !open ? filteredItems.slice(0, itemCount) : filteredItems;
  const hasMore = itemCount ? filteredItems.length > itemCount : false;

  const scrollLeft = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  }, []);

  const scrollRight = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  }, []);

  // Expose scroll functions to parent component
  useEffect(() => {
    if (horizontalLayout && onScrollControlsReady && displayItems.length > 0) {
      onScrollControlsReady(scrollLeft, scrollRight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizontalLayout, onScrollControlsReady, displayItems.length]);

  return (
    <>
      {/* Header actions (navigation buttons) */}
      {horizontalLayout && renderHeaderActions && displayItems.length > 0 && (
        <div className="mb-4">
          {renderHeaderActions(scrollLeft, scrollRight)}
        </div>
      )}

      {/* Inline items */}
      {horizontalLayout ? (
        <div className="w-full">
          <div 
            ref={scrollContainerRef}
            className="w-full overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-4" style={{ width: 'max-content' }}>
              {displayItems.map((item, index) => (
                <div
                  key={index}
                  style={{ minWidth: itemWidth, maxWidth: itemWidth, width: itemWidth }}
                  className="flex grow"
                >
                  {renderItem(item, index)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayItems.map((item, index) => (
            <div key={index}>{renderItem(item, index)}</div>
          ))}
        </div>
      )}

      {/* Inline expand button (only if showInlineExpandButton is true) */}
      {showInlineExpandButton && hasMore && (
        <div className="text-center pt-4 pb-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(true)}
            className="gap-2 w-full sm:w-auto"
          >
            <Maximize2 className="h-4 w-4" />
            View All {items.length} Items
          </Button>
        </div>
      )}

      {/* Trigger button (if provided and no inline items) */}
      {triggerButton && (
        <div onClick={() => handleOpenChange(true)}>
          {triggerButton}
        </div>
      )}

      {/* Full View Modal */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="min-w-7xl max-w-[95vw] max-h-[90vh] [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showNestedView && nestedView && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowNestedView(false);
                      if (onNestedViewClose) {
                        onNestedViewClose();
                      }
                    }}
                    className="h-8 w-8"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <span>{showNestedView && currentNestedViewTitle ? currentNestedViewTitle : title}</span>
              </div>
              <div className="flex items-center gap-3">
                {!showNestedView && (
                  <Badge variant="secondary">{filteredItems.length} items</Badge>
                )}
                {!showNestedView && onNavigateToFullView && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleOpenChange(false);
                          onNavigateToFullView();
                        }}
                        className="h-8 w-8"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Go to Jobs</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (showNestedView) {
                      setShowNestedView(false);
                      if (onNestedViewClose) {
                        onNestedViewClose();
                      }
                    } else {
                      handleOpenChange(false);
                    }
                  }}
                  className="h-8 w-8"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Show nested view or items list */}
          {showNestedView && currentNestedView ? (
            currentNestedView
          ) : (
            <>
              {/* Search, Filter, and Sort Bar */}
              <div className="flex gap-3 pb-4 border-b">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {filterOptions.length > 0 && (
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by..." />
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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-asc">Date (Earliest)</SelectItem>
                <SelectItem value="date-desc">Date (Latest)</SelectItem>
                <SelectItem value="client-asc">Client (A-Z)</SelectItem>
                <SelectItem value="client-desc">Client (Z-A)</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items List - Modal always uses grid layout when useGridLayout is true, regardless of horizontalLayout */}
          {useGridLayout ? (
            <ScrollArea className="max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4 items-stretch">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <div key={index} className="h-full flex">
                      <div className="w-full">{renderItem(item, index)}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : horizontalLayout ? (
            <div className="w-full overflow-x-auto">
              <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <div
                      key={index}
                      style={{ minWidth: itemWidth, maxWidth: itemWidth, width: itemWidth }}
                      className="flex-shrink-0"
                    >
                      {renderItem(item, index)}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground w-full">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(90vh-200px)]">
              <div className="space-y-4 pr-4">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item, index) => (
                    <div key={index}>{renderItem(item, index)}</div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    {emptyMessage}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

