import { useState, useMemo } from 'react';
import { Technician } from '../../../types';
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
import { Star, MapPin, Briefcase, Search, ArrowUpDown, Filter, Settings2 } from 'lucide-react';
import { getLocationDisplay } from '../../../lib/utils';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

interface TechnicianTableProps {
  technicians?: Technician[]; // Deprecated: use technicians
  onRowClick?: (technician: Technician | Technician) => void;
}

export function TechnicianTable({ technicians, onRowClick }: TechnicianTableProps) {
  // Use technicians if provided, fallback to technicians for backwards compatibility
  const effectiveTechnicians = technicians || technicians || [];
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name-asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter and sort technicians
  const filteredAndSortedTechnicians = useMemo(() => {
    let result = [...effectiveTechnicians];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((technician) => {
        const name = technician.name.toLowerCase();
        const email = technician.email.toLowerCase();
        const location = getLocationDisplay(technician.homeLocation.address, true).toLowerCase();
        return name.includes(query) || email.includes(query) || location.includes(query);
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Apply type filter (company/independent)
    if (typeFilter !== 'all') {
      if (typeFilter === 'company') {
        result = result.filter((p) => !p.isIndependent);
      } else if (typeFilter === 'independent') {
        result = result.filter((p) => p.isIndependent);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'rating-asc':
          return a.rating.overall - b.rating.overall;
        case 'rating-desc':
          return b.rating.overall - a.rating.overall;
        case 'jobs-asc':
          return a.reliability.totalJobs - b.reliability.totalJobs;
        case 'jobs-desc':
          return b.reliability.totalJobs - a.reliability.totalJobs;
        case 'onTime-asc':
          return a.reliability.onTimeRate - b.reliability.onTimeRate;
        case 'onTime-desc':
          return b.reliability.onTimeRate - a.reliability.onTimeRate;
        case 'status-asc':
          return a.status.localeCompare(b.status);
        case 'status-desc':
          return b.status.localeCompare(a.status);
        default:
          return 0;
      }
    });

    return result;
  }, [effectiveTechnicians, searchQuery, sortBy, statusFilter, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Search, Filter, and Sort Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            type="text"
            variant="muted"
            placeholder="Search by name, email, or location..."
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger variant="muted" className="w-10 md:w-[140px] shrink-0 [&>svg:last-child]:hidden md:[&>svg:last-child]:block">
            <Settings2 className="h-4 w-4 md:mr-2" />
            <SelectValue placeholder="Type" className="hidden md:inline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="independent">Independent</SelectItem>
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
            <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
            <SelectItem value="rating-asc">Rating (Low-High)</SelectItem>
            <SelectItem value="jobs-desc">Jobs (Most)</SelectItem>
            <SelectItem value="jobs-asc">Jobs (Least)</SelectItem>
            <SelectItem value="onTime-desc">On-Time (High-Low)</SelectItem>
            <SelectItem value="onTime-asc">On-Time (Low-High)</SelectItem>
            <SelectItem value="status-asc">Status (A-Z)</SelectItem>
            <SelectItem value="status-desc">Status (Z-A)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {filteredAndSortedTechnicians.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredAndSortedTechnicians.length} of {effectiveTechnicians.length} technicians
        </div>
      )}

      {/* Table */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Technician</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Jobs</TableHead>
          <TableHead>On-Time</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredAndSortedTechnicians.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
              No technicians found
            </TableCell>
          </TableRow>
        ) : (
          filteredAndSortedTechnicians.map((technician) => (
          <TableRow
            key={technician.id}
            className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
            onClick={() => onRowClick?.(technician)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border-2 border-border">
                  <AvatarImage src={technician.avatar} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {technician.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{technician.name}</div>
                  <div className="text-sm text-muted-foreground">{technician.email}</div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-muted-foreground">{getLocationDisplay(technician.homeLocation.address, true)}</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>{technician.rating.overall}</span>
                <span className="text-sm text-muted-foreground">({technician.rating.count})</span>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                <Briefcase className="h-4 w-4 text-muted-foreground/60" />
                <span>{technician.reliability.totalJobs}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {(technician.reliability.onTimeRate * 100).toFixed(0)}%
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant={technician.status === 'active' ? 'default' : 'secondary'}
              >
                {technician.status}
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

