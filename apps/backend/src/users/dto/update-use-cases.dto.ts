import { IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { ProviderUseCaseType } from '@prisma/client';

export class UpdateUseCasesDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one service must be selected' })
  @IsEnum(ProviderUseCaseType, { each: true })
  useCases: ProviderUseCaseType[];
}
