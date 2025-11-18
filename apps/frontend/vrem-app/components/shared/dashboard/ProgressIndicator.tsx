import { CheckCircle2, ArrowRight } from 'lucide-react';

interface ProgressStep {
  label: string;
  completed: boolean;
  active?: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
}

export function ProgressIndicator({ steps }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-2">
          {step.completed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : null}
          <span className={step.active ? 'text-primary' : step.completed ? '' : 'text-muted-foreground/60'}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 mx-2" />
          )}
        </div>
      ))}
    </div>
  );
}

