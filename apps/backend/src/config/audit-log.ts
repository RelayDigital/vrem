/**
 * Structured audit logging for public endpoint security events.
 *
 * Design principles:
 * - Never log full tokens (only masked versions)
 * - Include context (orgId, projectId) for traceability
 * - Use consistent event structure for log aggregation
 */

import { Logger } from '@nestjs/common';

/**
 * Mask a token for safe logging.
 * Shows first 4 and last 4 characters, masks the middle.
 * Example: "abc12345-6789-defg-hijk-lmnopqrstuv" -> "abc1...stuv"
 */
export function maskToken(token: string | undefined | null): string {
  if (!token) return '[none]';
  if (token.length <= 8) return '****';
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

/**
 * Audit event types for public endpoint security logging.
 */
export enum AuditEventType {
  // Delivery events
  DELIVERY_PAGE_VIEW = 'delivery.page_view',
  DELIVERY_COMMENTS_VIEW = 'delivery.comments_view',
  DELIVERY_APPROVE = 'delivery.approve',
  DELIVERY_REQUEST_CHANGES = 'delivery.request_changes',
  DELIVERY_COMMENT_ADD = 'delivery.comment_add',

  // Download events
  DOWNLOAD_REQUEST = 'download.request',
  DOWNLOAD_STATUS_CHECK = 'download.status_check',
  ARTIFACT_CREATED = 'artifact.created',
  ARTIFACT_READY = 'artifact.ready',
  ARTIFACT_FAILED = 'artifact.failed',

  // Invite events
  INVITE_VALIDATE = 'invite.validate',
  INVITE_ACCEPT = 'invite.accept',
  INVITE_DECLINE = 'invite.decline',
  INVITE_LOOKUP_BY_EMAIL = 'invite.lookup_by_email',

  // Auth events (for reference, handled in auth module)
  AUTH_LOGIN_ATTEMPT = 'auth.login_attempt',
  AUTH_REGISTER = 'auth.register',
}

/**
 * Base context for all audit events.
 */
interface AuditContext {
  ip?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * Audit event payload structure.
 */
interface AuditEvent {
  event: AuditEventType;
  context: AuditContext;
  data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Structured audit logger for security-relevant events.
 *
 * Usage:
 * ```ts
 * const audit = new AuditLogger(logger);
 * audit.log(AuditEventType.DELIVERY_PAGE_VIEW, req, {
 *   projectId: project.id,
 *   orgId: project.orgId,
 *   tokenMasked: maskToken(token),
 * });
 * ```
 */
export class AuditLogger {
  constructor(private readonly logger: Logger) {}

  /**
   * Extract request context for audit logging.
   */
  private extractContext(req?: any): AuditContext {
    if (!req) return {};

    const forwarded = req.headers?.['x-forwarded-for'];
    const ip = forwarded
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]?.trim())
      : req.ip || req.connection?.remoteAddress;

    return {
      ip: ip || undefined,
      userAgent: req.headers?.['user-agent'] || undefined,
      userId: req.user?.id || undefined,
    };
  }

  /**
   * Log a structured audit event.
   */
  log(
    event: AuditEventType,
    req: any | undefined,
    data: Record<string, unknown>,
  ): void {
    const auditEvent: AuditEvent = {
      event,
      context: this.extractContext(req),
      data,
      timestamp: new Date().toISOString(),
    };

    // Use structured JSON logging for easier parsing
    this.logger.log(`[AUDIT] ${JSON.stringify(auditEvent)}`);
  }

  /**
   * Log a security warning (e.g., rate limit hit, invalid token).
   */
  warn(
    event: AuditEventType,
    req: any | undefined,
    data: Record<string, unknown>,
    message: string,
  ): void {
    const auditEvent: AuditEvent = {
      event,
      context: this.extractContext(req),
      data: { ...data, warning: message },
      timestamp: new Date().toISOString(),
    };

    this.logger.warn(`[AUDIT] ${JSON.stringify(auditEvent)}`);
  }
}
