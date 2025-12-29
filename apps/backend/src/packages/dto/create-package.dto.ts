import { MediaType } from '@prisma/client';

export class CreatePackageDto {
  name: string;
  description?: string;
  price: number; // Price in cents
  currency?: string;
  mediaTypes: MediaType[];
  turnaroundDays?: number;
  photoCount?: number;
  videoMinutes?: number;
  features?: string[];
  images?: string[];
  displayOrder?: number;
}

export class UpdatePackageDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  mediaTypes?: MediaType[];
  isActive?: boolean;
  turnaroundDays?: number;
  photoCount?: number;
  videoMinutes?: number;
  features?: string[];
  images?: string[];
  displayOrder?: number;
}
