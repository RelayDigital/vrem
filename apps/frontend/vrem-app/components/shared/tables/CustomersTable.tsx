import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Search, ArrowUpDown, Mail, Briefcase } from 'lucide-react';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Skeleton } from '../../ui/skeleton';

export interface Customer {
  id: string;
  orgId?: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  totalJobs?: number;
  lastJob?: Date | string | null;
  agentId?: string;
  avatar?: string;
}

interface CustomersTableProps {
  customers?: Customer[];
  onRowClick?: (customer: Customer) => void;
  isLoading?: boolean;
}

export function CustomersTable({ customers = [], onRowClick, isLoading = false }: CustomersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');

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
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Last Job</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`customer-skeleton-${index}`}>
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
              </TableRow>
            ))
          ) : filteredAndSortedCustomers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            filteredAndSortedCustomers.map((customer) => (
              <TableRow
                key={customer.id}
                className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                onClick={() => onRowClick?.(customer)}
              >
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
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
