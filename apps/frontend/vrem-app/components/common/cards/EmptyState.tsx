import { Button } from '../../ui/button';
import { H3, Muted } from '../../ui/typography';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-16 w-16 mx-auto mb-4 text-muted-foreground/40" />
      <H3 className="text-xl text-foreground mb-2">{title}</H3>
      <Muted className="mb-6">{description}</Muted>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

