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
import { Badge } from '../../ui/badge';
import { Search, ArrowUpDown, Filter, Settings2, Building2, Mail, Briefcase } from 'lucide-react';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export interface Customer {
  id: string;
  name: string;
  brokerage: string;
  email: string;
  totalJobs: number;
  lastJob?: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
}

interface CustomersTableProps {
  customers?: Customer[];
  onRowClick?: (customer: Customer) => void;
}

export function CustomersTable({ customers = [], onRowClick }: CustomersTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let result = [...customers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((customer) => {
        const name = customer.name.toLowerCase();
        const email = customer.email.toLowerCase();
        const brokerage = customer.brokerage.toLowerCase();
        return name.includes(query) || email.includes(query) || brokerage.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'brokerage-asc':
          return a.brokerage.localeCompare(b.brokerage);
        case 'brokerage-desc':
          return b.brokerage.localeCompare(a.brokerage);
        case 'jobs-asc':
          return a.totalJobs - b.totalJobs;
        case 'jobs-desc':
          return b.totalJobs - a.totalJobs;
        case 'status-asc':
          return a.status.localeCompare(b.status);
        case 'status-desc':
          return b.status.localeCompare(a.status);
        default:
          return 0;
      }
    });

    return result;
  }, [customers, searchQuery, sortBy, statusFilter]);

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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger variant="muted" className="w-10 md:w-[140px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
            <Filter className="h-4 w-4 md:mr-2" />
            <SelectValue placeholder="Status" className="hidden md:inline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger variant="muted" className="w-10 md:w-[180px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
            <ArrowUpDown className="h-4 w-4 md:mr-2" />
            <SelectValue placeholder="Sort by" className="hidden md:inline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="brokerage-asc">Brokerage (A-Z)</SelectItem>
            <SelectItem value="brokerage-desc">Brokerage (Z-A)</SelectItem>
            <SelectItem value="jobs-desc">Jobs (Most)</SelectItem>
            <SelectItem value="jobs-asc">Jobs (Least)</SelectItem>
            <SelectItem value="status-asc">Status (A-Z)</SelectItem>
            <SelectItem value="status-desc">Status (Z-A)</SelectItem>
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
            <TableHead>Brokerage</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAndSortedCustomers.length === 0 ? (
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
                    <Building2 className="h-4 w-4 text-muted-foreground/60" />
                    <span>{customer.brokerage}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-muted-foreground">{customer.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground/60" />
                    <span>{customer.totalJobs}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={customer.status === 'Active' ? 'default' : 'secondary'}
                  >
                    {customer.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

