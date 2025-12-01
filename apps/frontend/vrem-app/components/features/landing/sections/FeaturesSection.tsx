import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { H2, H3, P } from '../../../ui/typography';
import {
  Sparkles,
  Zap,
  Shield,
  MapPin,
  TrendingUp,
  Heart,
} from 'lucide-react';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    description:
      'Advanced algorithms rank technicians by availability, location, reliability, and your preferred vendors.',
    color: '',
  },
  {
    icon: Zap,
    title: 'Instant Booking',
    description:
      'Book professional shoots in minutes, not hours. No more endless phone calls or email chains.',
    color: '',
  },
  {
    icon: Shield,
    title: 'Quality Guaranteed',
    description:
      'Every technician is vetted, rated, and tracked. See reliability scores before you book.',
    color: '',
  },
  {
    icon: MapPin,
    title: 'Location-Optimized',
    description:
      'Get technicians who are closest to your property for faster service and lower costs.',
    color: '',
  },
  {
    icon: TrendingUp,
    title: 'Fair Pricing',
    description:
      'No race-to-the-bottom bidding. Professional rates that respect technician expertise.',
    color: '',
  },
  {
    icon: Heart,
    title: 'Build Relationships',
    description:
      'Set preferred vendors who get prioritized for your bookings. Work with who you trust.',
    color: '',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-24 bg-card">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-accent text-foreground border-border">
            Why VX Media
          </Badge>
          <H2 className="text-4xl mb-4 text-foreground border-0">
            The smartest way to book photography
          </H2>
          <P className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our AI-powered platform matches you with the perfect technician based on
            availability, proximity, reliability, and your preferences.
          </P>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-2 hover:border-primary/50 transition-all">
              <CardContent className="p-6 space-y-4">
                <div className="inline-flex p-3 rounded-xl bg-primary">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <H3 className="text-xl text-foreground">{feature.title}</H3>
                <P className="text-muted-foreground">{feature.description}</P>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

