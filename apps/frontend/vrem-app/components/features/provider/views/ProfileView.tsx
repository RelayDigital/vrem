'use client';

import { ProviderProfile } from '../../../../types';
import { ProfileEditor } from '../../../common/forms/ProfileEditor';

interface ProfileViewProps {
  provider: ProviderProfile;
  onUpdateProfile: (updates: Partial<ProviderProfile>) => void;
}

export function ProfileView({ provider, onUpdateProfile }: ProfileViewProps) {
  return (
    <main className="container mx-auto p-6 h-full space-y-6">
      <div className="container mx-auto px-6" style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}>
        <ProfileEditor
          provider={provider}
          onSave={onUpdateProfile}
        />
      </div>
    </main>
  );
}
