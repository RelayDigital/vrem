import { NotificationType, OrgType, OrgRole } from '@prisma/client';

export class NotificationResponseDto {
  id: string;
  type: NotificationType;
  orgId: string;
  orgName: string;
  orgType: OrgType;
  createdAt: Date;
  readAt?: Date | null;

  // For invitation notifications
  invitationId?: string;
  role?: OrgRole;

  // For project assignment notifications
  projectId?: string;
  projectAddress?: string;
  assignedRole?: 'TECHNICIAN' | 'EDITOR' | 'PROJECT_MANAGER' | 'CUSTOMER';

  // For NEW_MESSAGE notifications
  messagePreview?: string;
  messageChannel?: 'TEAM' | 'CUSTOMER';

  // For PROJECT_APPROVED notifications
  approverName?: string;
}

