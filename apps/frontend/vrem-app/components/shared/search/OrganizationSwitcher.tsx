import { Organization } from '../../../types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Building2 } from 'lucide-react';

interface OrganizationSwitcherProps {
  organizations: Organization[];
  currentOrgId: string;
  onOrgChange: (orgId: string) => void;
}

export function OrganizationSwitcher({
  organizations,
  currentOrgId,
  onOrgChange,
}: OrganizationSwitcherProps) {
  const currentOrg = organizations.find((org) => org.id === currentOrgId);

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={currentOrgId} onValueChange={onOrgChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select organization" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className="flex items-center gap-2">
                <span>{org.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({org.type})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
