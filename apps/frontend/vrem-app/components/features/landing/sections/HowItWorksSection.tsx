import { Badge } from '../../../ui/badge';
import { H2, H3, P } from '../../../ui/typography';
import {
  MapPin,
  Camera,
  CheckCircle2,
} from 'lucide-react';

const steps = [
  {
    step: '01',
    title: 'Enter Property Address',
    description:
      'Start with the location. Our smart search makes it quick and easy.',
    icon: MapPin,
  },
  {
    step: '02',
    title: 'Add Shoot Details',
    description:
      'Tell us when you need the shoot and what media types you want.',
    icon: Camera,
  },
  {
    step: '03',
    title: 'Choose Your Technician',
    description:
      'Review AI-matched technicians or search for specific ones you prefer.',
    icon: CheckCircle2,
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-12 md:py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-accent text-foreground border-border">
            Simple Process
          </Badge>
          <H2 className="text-4xl mb-4 text-foreground border-0">
            Book in three easy steps
          </H2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-card rounded-2xl border-2 border-border p-8 space-y-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-6xl bg-muted ">
                    {step.step}
                  </div>
                  <div className="p-3 bg-primary rounded-xl">
                    <step.icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                </div>
                <H3 className="text-xl text-foreground">{step.title}</H3>
                <P className="text-muted-foreground">{step.description}</P>
              </div>
              {index < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-primary-foreground rounded-full" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

