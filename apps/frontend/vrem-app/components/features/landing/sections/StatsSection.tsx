import {
  Camera,
  Users,
  Star,
  Clock,
} from 'lucide-react';

const stats = [
  { value: '10,000+', label: 'Shoots Completed', icon: Camera },
  { value: '500+', label: 'Professional Photographers', icon: Users },
  { value: '98%', label: 'Client Satisfaction', icon: Star },
  { value: '24/7', label: 'Platform Availability', icon: Clock },
];

export function StatsSection() {
  return (
    <section className="py-12 md:py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-3">
              <div className="inline-flex p-4 bg-card/10 rounded-2xl backdrop-blur-sm">
                <stat.icon className="h-8 w-8" />
              </div>
              <div className="text-4xl font-bold">{stat.value}</div>
              <div className="text-primary-foreground/70">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

