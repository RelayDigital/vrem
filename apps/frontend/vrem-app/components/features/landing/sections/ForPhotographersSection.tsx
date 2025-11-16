import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { ImageWithFallback } from '../../../common';
import { H2, P, Small, Large } from '../../../ui/typography';
import {
  Camera,
  CheckCircle2,
  Award,
  Star,
} from 'lucide-react';

interface ForPhotographersSectionProps {
  onGetStarted: () => void;
  onBookShoot: () => void;
}

const benefits = [
  'Get matched with jobs based on your skills and location',
  'Fair pricing that respects your expertise',
  'Build relationships with preferred clients',
  'Track your performance and reliability score',
  'Manage your schedule and availability easily',
];

export function ForPhotographersSection({ onGetStarted, onBookShoot }: ForPhotographersSectionProps) {
  return (
    <section className="py-12 md:py-24 bg-card">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <Badge className="bg-accent text-foreground border-border">
              For Photographers
            </Badge>
            <H2 className="text-4xl text-foreground border-0">
              Grow your photography business
            </H2>
            <P className="text-lg text-muted-foreground">
              Join our network and get matched with quality clients automatically. No more
              competitive bidding or undercutting prices.
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
                Book a Shoot
              </Button>
              <Button
                onClick={onGetStarted}
                variant="outline"
                className="border-2 border-border hover:border-ring"
              >
                Join as Photographer
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-card">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1643968612613-fd411aecd1fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwaG90b2dyYXBoZXIlMjBjYW1lcmF8ZW58MXx8fHwxNzYyOTQ1MjE1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Professional photographer"
                className="w-full h-[500px] object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-card rounded-2xl p-6 shadow-2xl border-2 border-border max-w-xs">
              <div className="flex items-center gap-3 mb-2">
                <Award className="h-8 w-8 text-yellow-500" />
                <div>
                  <Small className="text-muted-foreground">Average Rating</Small>
                  <Large className="text-2xl text-foreground">4.9/5.0</Large>
                </div>
              </div>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

