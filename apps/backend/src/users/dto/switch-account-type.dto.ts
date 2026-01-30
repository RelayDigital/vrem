import { IsEnum } from 'class-validator';
import { UserAccountType } from '@prisma/client';

export class SwitchAccountTypeDto {
  @IsEnum(UserAccountType, { message: 'accountType must be AGENT or PROVIDER' })
  accountType: UserAccountType;
}
