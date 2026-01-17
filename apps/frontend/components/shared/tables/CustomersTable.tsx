import { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Search, ArrowUpDown, Mail, Briefcase, Pencil, Trash, DoorOpen } from 'lucide-react';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Skeleton } from '../../ui/skeleton';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { Checkbox } from '../../ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../ui/pagination';

export interface Customer {
  id: string;
  orgId?: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  totalJobs?: number;
  lastJob?: Date | string | null;
  userId?: string;
  avatar?: string;
}

interface CustomersTableProps {
  customers?: Customer[];
  onRowClick?: (customer: Customer) => void;
  isLoading?: boolean;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  deletingId?: string | null;
  isDeleting?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (customerId: string, selected: boolean) => void;
  onToggleSelectAll?: (customerIds: string[], selected: boolean) => void;
}

export function CustomersTable({
  customers = [],
  onRowClick,
  isLoading = false,
  onEdit,
  onDelete,
  deletingId,
  isDeleting = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}: CustomersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((customer) => {
        const name = customer.name.toLowerCase();
        const email = (customer.email || '').toLowerCase();
        const notes = (customer.notes || '').toLowerCase();
        const phone = (customer.phone || '').toLowerCase();
        return name.includes(query) || email.includes(query) || notes.includes(query) || phone.includes(query);
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'notes-asc':
          return (a.notes || '').localeCompare(b.notes || '');
        case 'notes-desc':
          return (b.notes || '').localeCompare(a.notes || '');
        case 'jobs-asc':
          return (a.totalJobs || 0) - (b.totalJobs || 0);
        case 'jobs-desc':
          return (b.totalJobs || 0) - (a.totalJobs || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [customers, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedCustomers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredAndSortedCustomers.slice(startIndex, endIndex);

  const allVisibleSelected =
    paginatedCustomers.length > 0 &&
    paginatedCustomers.every((customer) => selectedIds.includes(customer.id));
  const someVisibleSelected =
    paginatedCustomers.some((customer) => selectedIds.includes(customer.id)) &&
    !allVisibleSelected;

  // Keep page in range when filters or per-page change
  useEffect(() => {
    const nextTotalPages = Math.max(
      1,
      Math.ceil(filteredAndSortedCustomers.length / itemsPerPage)
    );
    if (currentPage > nextTotalPages) {
      setCurrentPage(nextTotalPages);
    } else if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedCustomers.length, itemsPerPage, currentPage]);

  const changePage = (page: number) => {
    const next = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(next);
  };

  const pageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  const formatDate = (value?: Date | string) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Search, Filter, and Sort Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="text"
            variant="muted"
            placeholder="Search by name, email, or brokerage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger variant="muted" className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
            <ArrowUpDown className="h-4 w-4 md:mr-2" />
            <SelectValue placeholder="Sort by" className="hidden md:inline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="notes-asc">Notes (A-Z)</SelectItem>
            <SelectItem value="notes-desc">Notes (Z-A)</SelectItem>
            <SelectItem value="jobs-desc">Jobs (Most)</SelectItem>
            <SelectItem value="jobs-asc">Jobs (Least)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {filteredAndSortedCustomers.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedCustomers.length} of {customers.length} customers
        </div>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                aria-label="Select all"
                checked={allVisibleSelected}
                // indeterminate={someVisibleSelected}
                onCheckedChange={(checked) =>
                  onToggleSelectAll?.(
                    filteredAndSortedCustomers.map((c) => c.id),
                    Boolean(checked)
                  )
                }
                disabled={filteredAndSortedCustomers.length === 0}
              />
            </TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Last Job</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`customer-skeleton-${index}`}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border-2 border-border">
                      <AvatarImage />
                      <AvatarFallback className="bg-muted" />
                    </Avatar>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-12" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : filteredAndSortedCustomers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            paginatedCustomers.map((customer) => (
              <TableRow
                key={customer.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(customer)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select ${customer.name}`}
                    checked={selectedIds.includes(customer.id)}
                    onCheckedChange={(checked) =>
                      onToggleSelect?.(customer.id, Boolean(checked))
                    }
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border-2 border-border">
                      <AvatarImage src={customer.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {customer.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      {customer.lastJob && (
                        <div className="text-sm text-muted-foreground">
                          Last job: {new Date(customer.lastJob).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-muted-foreground">{customer.email || '—'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {customer.phone || '—'}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground/60" />
                    <span>{customer.totalJobs ?? 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">
                    {customer.lastJob
                      ? new Date(customer.lastJob as any).toLocaleDateString()
                      : '—'}
                  </div>
                </TableCell>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground cursor-default">
                        {formatDate(customer.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {customer.createdAt
                        ? new Date(customer.createdAt).toISOString()
                        : 'Unknown'}
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customer.userId) return;
                        onEdit?.(customer);
                      }}
                      disabled={!!customer.userId || !onEdit}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(customer);
                          }}
                          disabled={
                            !onDelete ||
                            deletingId === customer.id ||
                            deletingId === 'bulk' ||
                            isDeleting
                          }
                        >
                          {customer.userId ? (
                            <DoorOpen className="h-4 w-4 text-destructive" />
                          ) : (
                            <Trash className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {customer.userId ? 'Remove from organization' : 'Delete customer'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {!isLoading && filteredAndSortedCustomers.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-
            {Math.min(endIndex, filteredAndSortedCustomers.length)} of {filteredAndSortedCustomers.length}
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(val) => {
                setItemsPerPage(Number(val));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Per page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => changePage(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {pageNumbers().map((page, idx) => (
                    <PaginationItem key={`${page}-${idx}`}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => changePage(page)}
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
                      onClick={() => changePage(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
