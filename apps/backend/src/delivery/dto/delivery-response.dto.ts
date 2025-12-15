import { ClientApprovalStatus, MediaType, ProjectStatus } from '@prisma/client';

export class MediaDto {
  id: string;
  key: string;
  cdnUrl: string | null;
  filename: string;
  size: number;
  type: MediaType;
  createdAt: Date;
}

export class CommentDto {
  id: string;
  content: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
  };
}

export class DeliveryResponseDto {
  project: {
    id: string;
    addressLine1: string | null;
    city: string | null;
    region: string | null;
    scheduledTime: Date;
    status: ProjectStatus;
    clientApprovalStatus: ClientApprovalStatus;
    clientApprovedAt: Date | null;
    deliveryEnabledAt: Date | null;
  };

  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
    primaryEmail: string | null;
    phone: string | null;
  };

  media: MediaDto[];

  comments: CommentDto[];

  customer?: {
    id: string;
    name: string;
    email: string | null;
  };

  canApprove: boolean;
}

export class AddCommentDto {
  content: string;
}

export class RequestChangesDto {
  feedback: string;
}

export class DownloadAllDto {
  mediaTypes?: MediaType[];
}
