import { H4, P, Small, Large, List, ListItem } from '../../../ui/typography';
import { Camera } from 'lucide-react';

export function FooterSection() {
  return (
    <footer className="bg-primary text-primary-foreground py-8 md:py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-card/10 rounded-lg">
                <Camera className="h-5 w-5" />
              </div>
              <Large className="text-primary-foreground">VX Media</Large>
            </div>
            <Small className="text-primary-foreground/60">
              AI-powered photography operations platform for real estate professionals.
            </Small>
          </div>
          <div>
            <H4>Platform</H4>
            <List className="space-y-2 text-sm text-primary-foreground/60 list-none ml-0">
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  How it works
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Pricing
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  For Technicians
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  For Companies
                </a>
              </ListItem>
            </List>
          </div>
          <div>
            <H4>Resources</H4>
            <List className="space-y-2 text-sm text-primary-foreground/60 list-none ml-0">
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Documentation
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  API
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Support
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Blog
                </a>
              </ListItem>
            </List>
          </div>
          <div>
            <H4>Company</H4>
            <List className="space-y-2 text-sm text-primary-foreground/60 list-none ml-0">
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  About
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Privacy
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Terms
                </a>
              </ListItem>
              <ListItem className="list-none">
                <a href="#" className="hover:text-primary-foreground transition-colors">
                  Contact
                </a>
              </ListItem>
            </List>
          </div>
        </div>
        <div className="border-t border-primary-foreground/20 pt-8 text-center">
          <Small className="text-primary-foreground/60">
            © 2025 VX Media Operations. All rights reserved.
          </Small>
        </div>
      </div>
    </footer>
  );
}

