import {
  IsEnum,
  IsOptional,
  IsArray,
} from 'class-validator';
import { UserAccountType, ProviderUseCaseType } from '@prisma/client';

export class CompleteOnboardingDto {
  @IsEnum(UserAccountType, { message: 'accountType must be AGENT or PROVIDER' })
  accountType: UserAccountType;

  @IsOptional()
  @IsArray()
  @IsEnum(ProviderUseCaseType, { each: true })
  useCases?: ProviderUseCaseType[];
}
