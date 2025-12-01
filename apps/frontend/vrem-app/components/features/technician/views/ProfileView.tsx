'use client';

import { Technician } from '../../../../types';
import { ProfileEditor } from '../../../common/forms/ProfileEditor';

interface ProfileViewProps {
  technician: Technician;
  onUpdateProfile: (updates: Partial<Technician>) => void;
}

export function ProfileView({ technician, onUpdateProfile }: ProfileViewProps) {
  return (
    <main className="container mx-auto p-6 h-full space-y-6">
      <div className="container mx-auto px-6" style={{ maxWidth: '896px', marginLeft: 'auto', marginRight: 'auto' }}>
        <ProfileEditor
          technician={technician}
          onSave={onUpdateProfile}
        />
      </div>
    </main>
  );
}
