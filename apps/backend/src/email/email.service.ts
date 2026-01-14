import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not set - emails will be logged to console only',
      );
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.EMAIL_FROM || 'VREM <noreply@vrem.app>';
  }

  /**
   * Send an OTP verification code email.
   */
  async sendOtpEmail(to: string, code: string): Promise<boolean> {
    const subject = 'Your VREM verification code';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; font-size: 24px; margin-bottom: 24px;">
          Verify your email
        </h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Enter this code to complete your signup:
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">
            ${code}
          </span>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.5;">
          This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
        <p style="color: #a1a1aa; font-size: 12px;">
          VREM - Visual Real Estate Media
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send an organization invitation email.
   * For existing users, they can accept via the app.
   * For new users, includes a signup link with the invite code.
   */
  async sendInvitationEmail(
    to: string,
    inviterName: string,
    organizationName: string,
    inviteToken: string,
    isExistingUser: boolean,
    inviteType: 'MEMBER' | 'CUSTOMER' = 'MEMBER',
    role?: string,
  ): Promise<boolean> {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteUrl = isExistingUser
      ? `${appUrl}/dashboard?invite=${inviteToken}`
      : `${appUrl}/signup?invite=${inviteToken}`;

    // Build role description based on invite type and role
    let roleDescription: string;
    if (inviteType === 'CUSTOMER') {
      roleDescription = 'to view and approve project deliveries';
    } else {
      // Team member - include specific role if provided
      const roleLabel = role ? this.formatRole(role) : 'team member';
      roleDescription = `to join their team as ${roleLabel}`;
    }

    const subject = `${inviterName} invited you to ${organizationName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">
            You're invited to ${organizationName}
          </h1>
          <p style="color: #71717a; font-size: 16px; margin: 0;">
            ${inviterName} has invited you ${roleDescription}
          </p>
        </div>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Organization</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${organizationName}</td>
            </tr>
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Invited by</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${inviterName}</td>
            </tr>
            ${inviteType !== 'CUSTOMER' && role ? `
            <tr>
              <td style="color: #71717a; font-size: 14px;">Role</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${this.formatRole(role)}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${inviteUrl}"
             style="display: inline-block; background: #18181b; color: white; padding: 14px 32px;
                    border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
            ${isExistingUser ? 'Accept Invitation' : 'Create Account & Accept'}
          </a>
        </div>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
          ${isExistingUser
            ? 'You can also accept this invitation from your notifications in the VREM app.'
            : 'Click the button above to create your VREM account and accept this invitation.'}
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />

        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0 0 8px 0;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          VREM - Visual Real Estate Media
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send a delivery link email to the customer.
   * Notifies them that project media is ready for review.
   */
  async sendDeliveryEmail(
    to: string,
    customerName: string,
    organizationName: string,
    projectAddress: string,
    deliveryToken: string,
  ): Promise<boolean> {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const deliveryUrl = `${appUrl}/delivery/${deliveryToken}`;

    const subject = `Your media is ready from ${organizationName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">
            Your media is ready!
          </h1>
          <p style="color: #71717a; font-size: 16px; margin: 0;">
            ${organizationName} has finished processing your project
          </p>
        </div>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Project</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${projectAddress}</td>
            </tr>
            <tr>
              <td style="color: #71717a; font-size: 14px;">From</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${organizationName}</td>
            </tr>
          </table>
        </div>

        <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
          Hi${customerName ? ` ${customerName}` : ''},<br/>
          Your photos and videos are ready for review. Click below to view, download, and approve your media.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${deliveryUrl}"
             style="display: inline-block; background: #18181b; color: white; padding: 14px 32px;
                    border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 16px;">
            View Your Media
          </a>
        </div>

        <p style="color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
          You can view, download individual files or all media, leave comments, and approve the delivery.
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />

        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          VREM - Visual Real Estate Media
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send an approval status change notification email.
   */
  async sendApprovalNotificationEmail(
    to: string,
    recipientName: string,
    organizationName: string,
    projectAddress: string,
    status: 'APPROVED' | 'CHANGES_REQUESTED',
    customerName: string,
    comment?: string,
  ): Promise<boolean> {
    const statusLabel = status === 'APPROVED' ? 'approved' : 'requested changes on';
    const statusColor = status === 'APPROVED' ? '#22c55e' : '#f59e0b';
    const statusBg = status === 'APPROVED' ? '#dcfce7' : '#fef3c7';

    const subject = status === 'APPROVED'
      ? `Project approved: ${projectAddress}`
      : `Changes requested: ${projectAddress}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: ${statusBg}; color: ${statusColor}; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500; margin-bottom: 16px;">
            ${status === 'APPROVED' ? 'Approved' : 'Changes Requested'}
          </div>
          <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">
            ${customerName} ${statusLabel} the delivery
          </h1>
        </div>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Project</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${projectAddress}</td>
            </tr>
            <tr>
              <td style="color: #71717a; font-size: 14px;">Customer</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${customerName}</td>
            </tr>
          </table>
        </div>

        ${comment ? `
        <div style="background: #fafafa; border-left: 4px solid ${statusColor}; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
          <p style="color: #71717a; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Customer feedback</p>
          <p style="color: #18181b; font-size: 15px; line-height: 1.5; margin: 0;">${comment}</p>
        </div>
        ` : ''}

        <p style="color: #71717a; font-size: 14px; line-height: 1.6; text-align: center;">
          ${status === 'APPROVED'
            ? 'Great work! This project has been approved by the customer.'
            : 'Please review the feedback and make the requested changes.'}
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />

        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          VREM - Visual Real Estate Media
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Send a project assignment notification email.
   * Notifies a user when they are assigned to a project.
   */
  async sendProjectAssignmentEmail(
    to: string,
    recipientName: string,
    projectAddress: string,
    role: 'TECHNICIAN' | 'EDITOR' | 'PROJECT_MANAGER' | 'CUSTOMER',
    organizationName: string,
    scheduledTime?: Date,
  ): Promise<boolean> {
    const roleLabels: Record<string, string> = {
      'TECHNICIAN': 'Technician',
      'EDITOR': 'Editor',
      'PROJECT_MANAGER': 'Project Manager',
      'CUSTOMER': 'Customer',
    };

    const roleLabel = roleLabels[role] || role;
    const subject = `You've been assigned to a project: ${projectAddress}`;

    const scheduledSection = scheduledTime ? `
    <tr>
      <td style="color: #71717a; font-size: 14px;">Scheduled</td>
      <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right;">${new Date(scheduledTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
    </tr>
    ` : '';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #18181b; font-size: 24px; margin: 0 0 8px 0; font-weight: 600;">
            New Project Assignment
          </h1>
          <p style="color: #71717a; font-size: 16px; margin: 0;">
            You've been assigned as ${roleLabel} on a project
          </p>
        </div>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%;">
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Project</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${projectAddress}</td>
            </tr>
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Role</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="color: #71717a; font-size: 14px; padding-bottom: 8px;">Organization</td>
              <td style="color: #18181b; font-size: 14px; font-weight: 500; text-align: right; padding-bottom: 8px;">${organizationName}</td>
            </tr>
            ${scheduledSection}
          </table>
        </div>

        <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
          Hi${recipientName ? ` ${recipientName}` : ''},<br/>
          You have been assigned to this project. Log in to VREM to view details and get started.
        </p>

        <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />

        <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
          VREM - Visual Real Estate Media
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }

  /**
   * Format role enum to human-readable string.
   */
  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'OWNER': 'an Owner',
      'ADMIN': 'an Administrator',
      'PROJECT_MANAGER': 'a Project Manager',
      'TECHNICIAN': 'a Technician',
      'EDITOR': 'an Editor',
      'AGENT': 'a Team Member',
    };
    return roleMap[role] || 'a team member';
  }

  /**
   * Generic email sending method.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    // If no API key, log to console (development mode)
    if (!process.env.RESEND_API_KEY) {
      this.logger.log(`[DEV] Email to ${to}:`);
      this.logger.log(`Subject: ${subject}`);
      this.logger.log(`Body: ${html.replace(/<[^>]*>/g, '')}`);
      return true;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent to ${to}, id: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending email to ${to}: ${error.message}`);
      return false;
    }
  }
}
