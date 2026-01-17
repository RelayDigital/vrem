'use client';

import { Button } from '../../ui/button';
import { H1, Muted } from '../../ui/typography';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  className?: string;
}

export function PageHeader({ title, description, action, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <H1 className="text-3xl text-foreground">{title}</H1>
        {description && (
          <Muted className="mt-1">{description}</Muted>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="bg-primary">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}

