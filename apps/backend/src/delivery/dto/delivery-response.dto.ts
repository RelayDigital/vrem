import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClientApprovalStatus, MediaType, ProjectStatus } from '@prisma/client';

export class MediaDto {
  id: string;
  key: string | null; // Storage key (null for external URLs like virtual tours)
  cdnUrl: string | null;
  externalUrl: string | null; // External URL for virtual tours (iGUIDE, Matterport, etc.)
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
    avatarUrl?: string | null;
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

  canComment: boolean;

  /** Whether bulk download is available (requires storage backend) */
  downloadEnabled: boolean;

  /** Whether user can retry failed artifacts (OWNER/ADMIN/PROJECT_MANAGER only) */
  canRetryArtifact: boolean;
}

export class AddCommentDto {
  @ApiProperty({ description: 'Comment content' })
  content: string;
}

export class RequestChangesDto {
  @ApiProperty({ description: 'Feedback text for requested changes' })
  feedback: string;
}

export class DownloadAllDto {
  @ApiPropertyOptional({ description: 'Filter download by media types', enum: MediaType, isArray: true })
  mediaTypes?: MediaType[];
}

export class RetryArtifactDto {
  @ApiProperty({ description: 'ID of the artifact to retry' })
  artifactId: string;
}
