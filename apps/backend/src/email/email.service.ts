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
