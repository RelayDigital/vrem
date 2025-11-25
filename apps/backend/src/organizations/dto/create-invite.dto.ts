import { IsEmail, IsEnum, IsString } from 'class-validator';
import { OrgRole } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsEnum(OrgRole)
  role: OrgRole;
}
