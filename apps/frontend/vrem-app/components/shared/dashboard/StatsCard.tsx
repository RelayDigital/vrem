import { Card } from '../../ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  iconBgColor?: string;
  iconColor?: string;
  valueSuffix?: string;
}

export function StatsCard({
  icon: Icon,
  value,
  label,
  iconBgColor = 'bg-accent',
  iconColor = 'text-primary',
  valueSuffix = '',
}: StatsCardProps) {
  return (
    <Card className="p-6 gap-0">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 ${iconBgColor} rounded-xl`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <div className="text-3xl font-bold text-foreground mb-1">
        {value}{valueSuffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </Card>
  );
}

