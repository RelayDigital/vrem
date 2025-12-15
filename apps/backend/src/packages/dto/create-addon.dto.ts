import { AddOnCategory } from '@prisma/client';

export class CreateAddOnDto {
  name: string;
  description?: string;
  price: number; // Price in cents
  currency?: string;
  category?: AddOnCategory;
  displayOrder?: number;
}

export class UpdateAddOnDto {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  category?: AddOnCategory;
  isActive?: boolean;
  displayOrder?: number;
}
