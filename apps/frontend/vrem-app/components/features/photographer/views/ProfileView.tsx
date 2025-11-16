'use client';

import { Photographer } from '../../../../types';
import { ProfileEditor } from '../../../common/forms/ProfileEditor';

interface ProfileViewProps {
  photographer: Photographer;
  onUpdateProfile: (updates: Partial<Photographer>) => void;
}

export function ProfileView({ photographer, onUpdateProfile }: ProfileViewProps) {
  return (
    <main className="container mx-auto p-6 h-full space-y-6">
      <div className="container mx-auto px-6" style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}>
        <ProfileEditor
          photographer={photographer}
          onSave={onUpdateProfile}
        />
      </div>
    </main>
  );
}
