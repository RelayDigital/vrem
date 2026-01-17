import { Camera, Video, Plane, Sunset, Ruler } from 'lucide-react';

export const mediaTypeOptions = [
  { id: 'photo', label: 'Photography', icon: Camera, color: '' },
  { id: 'measurement', label: 'Measurements', icon: Ruler, color: '' },
  { id: 'video', label: 'Video', icon: Video, color: '' },
  { id: 'aerial', label: 'Aerial/Drone', icon: Plane, color: '' },
  { id: 'twilight', label: 'Twilight', icon: Sunset, color: '' },
];

export function toggleMediaType(currentTypes: string[], typeToToggle: string): string[] {
  return currentTypes.includes(typeToToggle)
    ? currentTypes.filter((t) => t !== typeToToggle)
    : [...currentTypes, typeToToggle];
}
