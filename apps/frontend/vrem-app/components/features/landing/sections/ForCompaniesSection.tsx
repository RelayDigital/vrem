import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ImageWithFallback } from '../../../common';
import { H2, P, Small, Large } from '../../../ui/typography';
import {
  Camera,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

interface ForCompaniesSectionProps {
  onGetStarted: () => void;
  onBookShoot: () => void;
}

const benefits = [
  'AI-powered job assignment and routing',
  'Real-time tracking and photographer availability',
  'Performance metrics and reliability scores',
  'Multi-tenant architecture for enterprise teams',
  'Complete audit trail and accountability',
];

export function ForCompaniesSection({ onGetStarted, onBookShoot }: ForCompaniesSectionProps) {
  return (
    <section className="py-12 md:py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-card">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1601509876296-aba16d4c10a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHRlYW0lMjBjb2xsYWJvcmF0aW9ufGVufDF8fHx8MTc2Mjk1MDI2Nnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Team collaboration"
                className="w-full h-[500px] object-cover"
              />
            </div>
            <div className="absolute -top-6 -left-6 bg-card rounded-2xl p-6 shadow-2xl border-2 border-border">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <Small className="text-muted-foreground">Efficiency Gain</Small>
                  <Large className="text-2xl text-emerald-600">+45%</Large>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <Badge className="bg-accent text-foreground border-border">
              For Media Companies
            </Badge>
            <H2 className="text-4xl text-foreground border-0">
              Streamline your operations
            </H2>
            <P className="text-lg text-muted-foreground">
              Manage your photographer network, dispatch jobs intelligently, and track
              performance with powerful analytics.
            </P>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{benefit}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={onBookShoot}
                className="bg-primary hover:bg-primary/90"
              >
                <Camera className="h-4 w-4 mr-2" />
                Book Now
              </Button>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="border-2 border-border hover:border-ring"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

