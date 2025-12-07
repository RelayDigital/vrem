import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { OrgRole, InvitationType } from '@prisma/client';

export class CreateInviteDto {
  @IsEmail()
  email: string;

  @IsEnum(OrgRole)
  @IsOptional()
  role?: OrgRole;

  @IsEnum(InvitationType)
  @IsOptional()
  inviteType?: InvitationType;
}
