'use client';

import { useState } from 'react';
import { Organization } from '../../../types';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { H3, Small, Muted } from '../../ui/typography';
import { Star, User, Send } from 'lucide-react';

interface CompanyCardProps {
  company: Organization;
  onApply?: (companyId: string, message: string) => void;
  isApplied?: boolean;
  showApplyButton?: boolean;
}

export function CompanyCard({ company, onApply, isApplied = false, showApplyButton = true }: CompanyCardProps) {
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');

  const handleSubmitApplication = () => {
    if (onApply) {
      onApply(company.id, applicationMessage);
      setShowApplicationForm(false);
      setApplicationMessage('');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex gap-6">
        <Avatar className="size-20 border-2 border-border">
          <AvatarImage src={company.avatar} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {company.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <div>
            <H3 className="text-lg mb-1">{company.name}</H3>
            <Small className="text-muted-foreground">{company.description}</Small>
          </div>
          <div className="flex items-center gap-4">
            {company.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <Small>{company.rating}</Small>
                <Muted>
                  ({company.reviewCount})
                </Muted>
              </div>
            )}
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-muted-foreground/60" />
              <Small>{company.photographerCount} photographers</Small>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {company.services?.map((service) => (
              <Badge key={service} variant="outline">
                {service}
              </Badge>
            ))}
          </div>
          
          {showApplyButton && (
            showApplicationForm ? (
              <div className="space-y-3 pt-3 border-t">
                <Textarea
                  value={applicationMessage}
                  onChange={(e) => setApplicationMessage(e.target.value)}
                  placeholder="Tell them why you'd like to join..."
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowApplicationForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitApplication}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Application
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowApplicationForm(true)}
                disabled={isApplied}
              >
                {isApplied ? 'Application Pending' : 'Apply to Join'}
              </Button>
            )
          )}
        </div>
      </div>
    </Card>
  );
}

