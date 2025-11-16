import { Button } from '../../../ui/button';
import { H2, Lead } from '../../../ui/typography';
import { Sparkles, Camera } from 'lucide-react';

interface CTASectionProps {
  onBookShoot: () => void;
}

export function CTASection({ onBookShoot }: CTASectionProps) {
  return (
    <section className="py-12 md:py-24 bg-primary">
      <div className="container mx-auto px-6 text-center text-primary-foreground" style={{ maxWidth: '896px' }}>
        <Sparkles className="h-16 w-16 mx-auto mb-6" />
        <H2 className="text-4xl mb-6 border-0 text-primary-foreground">Ready to book your next shoot?</H2>
        <Lead className="text-primary-foreground/70 mb-8">
          Join thousands of real estate professionals who trust VX Media for their
          photography needs.
        </Lead>
        <Button
          onClick={onBookShoot}
          size="lg"
          className="bg-card text-foreground hover:bg-card/90 shadow-xl"
        >
          <Camera className="h-5 w-5 mr-2" />
          Book a Shoot Now
        </Button>
      </div>
    </section>
  );
}

