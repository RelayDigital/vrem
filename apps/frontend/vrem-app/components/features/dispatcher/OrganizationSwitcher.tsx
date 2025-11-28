'use client';

import { Building2, Check, ChevronDown, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

export function OrganizationSwitcher() {
  const { memberships, isLoading, setActiveOrganization } = useOrganizations();
  const { activeOrganizationId } = useCurrentOrganization();
  const router = useRouter();
  const { state: sidebarState } = useSidebar();

  const activeOrg = useMemo(
    () => memberships.find((m) => m.orgId === activeOrganizationId)?.organization,
    [memberships, activeOrganizationId]
  );

  const selectOrg = (orgId: string) => {
    setActiveOrganization(orgId);
  };

  const goToManage = () => {
    router.push('/dispatcher/organization');
  };

  return (
    <div className="p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="flat"
            className="w-full justify-between text-left p-0!"
          >
            <div className="flex items-center gap-2">
              <Avatar className="size-7">
                <AvatarImage src={activeOrg?.avatar} alt={activeOrg?.name} />
                <AvatarFallback>
                  <Building2 className="size-3" />
                </AvatarFallback>
              </Avatar>
              {sidebarState === 'expanded' && (
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{activeOrg?.name || 'Select organization'}</span>
                  <span className="text-xs text-muted-foreground capitalize">{activeOrg?.type?.replace('_', ' ') || '—'}</span>
                </div>
              )}
            </div>
            {sidebarState === 'expanded' && <ChevronsUpDown className="size-3 text-muted-foreground ml-auto" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72 max-h-[400px]" align="start">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {isLoading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                Loading...
              </div>
            )}
            {!isLoading && memberships.length === 0 && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No organizations found
              </div>
            )}
            {!isLoading && memberships.map((m) => (
              <DropdownMenuItem
                key={m.orgId}
                onClick={() => selectOrg(m.orgId)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={m.organization?.avatar} />
                  <AvatarFallback>
                    <Building2 className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">
                    {m.organization?.name || m.orgId}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize truncate">
                    {m.organization?.type?.replace('_', ' ') || 'Member'}
                  </span>
                </div>
                {m.orgId === activeOrganizationId && (
                  <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={goToManage}>
              <Settings className="h-4 w-4 mr-2" />
              Manage organization
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add organization
              <span className="ml-auto text-xs text-muted-foreground">Soon</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
