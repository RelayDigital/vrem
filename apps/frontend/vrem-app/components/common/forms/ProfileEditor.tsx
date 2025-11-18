'use client';

import { useState } from 'react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Badge } from '../../ui/badge';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { Checkbox } from '../../ui/checkbox';
import { H2, H3, Small, Muted, Large } from '../../ui/typography';
import { Photographer } from '../../../types';
import { CheckCircle2, XCircle, Settings } from 'lucide-react';

interface ProfileEditorProps {
  photographer: Photographer;
  onSave: (updates: Partial<Photographer>) => void;
}

export function ProfileEditor({ photographer, onSave }: ProfileEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    bio: photographer.bio || '',
    services: photographer.services,
  });

  const handleSave = () => {
    onSave(profileData);
    setIsEditing(false);
  };

  return (
    <Card className="p-8">
      <div className="flex items-start justify-between mb-6">
        <H2 className="text-2xl border-0">My Profile</H2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => setIsEditing(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="flex items-start gap-6">
          <Avatar className="h-24 w-24 border-4 border-card shadow-lg">
            <AvatarImage src={photographer.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {photographer.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <H3 className="text-xl mb-1">{photographer.name}</H3>
            <Small className="text-muted-foreground mb-2">{photographer.email}</Small>
            {photographer.isIndependent ? (
              <Badge variant="outline" className="border-primary text-foreground/90">
                Independent Photographer
              </Badge>
            ) : (
              <Badge className="bg-primary text-primary-foreground">
                {photographer.companyName}
              </Badge>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label>Bio</Label>
          {isEditing ? (
            <Textarea
              value={profileData.bio}
              onChange={(e) =>
                setProfileData({ ...profileData, bio: e.target.value })
              }
              placeholder="Tell clients about your experience and specialties..."
              rows={4}
            />
          ) : (
            <Small className="text-muted-foreground">
              {photographer.bio || 'No bio added yet'}
            </Small>
          )}
        </div>

        {/* Services */}
        <div className="space-y-3">
          <Label>Services Offered</Label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(profileData.services).map(([service, enabled]) => (
              <div
                key={service}
                className={`p-4 rounded-xl border-2 transition-all ${
                  enabled
                    ? 'border-primary bg-accent'
                    : 'border-border bg-card'
                } ${isEditing ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (isEditing) {
                    setProfileData({
                      ...profileData,
                      services: {
                        ...profileData.services,
                        [service]: !enabled,
                      },
                    });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {service.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  {isEditing ? (
                    <Checkbox checked={enabled} />
                  ) : enabled ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="text-center">
            <Large className="mb-1">{photographer.reliability.totalJobs}</Large>
            <Small className="text-muted-foreground">Total Jobs</Small>
          </div>
          <div className="text-center">
            <Large className="mb-1">{photographer.rating.overall}</Large>
            <Small className="text-muted-foreground">Rating</Small>
          </div>
          <div className="text-center">
            <Large className="mb-1">
              {(photographer.reliability.onTimeRate * 100).toFixed(0)}%
            </Large>
            <Small className="text-muted-foreground">On-Time</Small>
          </div>
        </div>
      </div>
    </Card>
  );
}

