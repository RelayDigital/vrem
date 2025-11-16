'use client';

import * as React from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';

export interface ContextOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface ContextSwitcherProps {
  options: ContextOption[];
  currentValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ContextSwitcher({
  options,
  currentValue,
  onValueChange,
  placeholder = 'Select context...',
  className,
}: ContextSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const currentOption = options.find((opt) => opt.value === currentValue);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {currentOption?.icon && (
              <currentOption.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">
              {currentOption?.label || placeholder}
            </span>
            {currentOption && (
              <Badge variant="outline" className="text-xs shrink-0 capitalize">
                {currentOption.value}
              </Badge>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search context..." />
          <CommandList>
            <CommandEmpty>No context found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      currentValue === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option.icon && (
                    <option.icon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

