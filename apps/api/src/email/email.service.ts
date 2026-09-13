import { Injectable, Logger } from '@nestjs/common';
import {
  EmailProvider,
  getEmailProvider,
  EmailMessage,
  createEmailVerificationTemplate,
  createPasswordResetTemplate,
  createPasswordChangedTemplate,
  createWelcomeCadetTemplate,
  createTestResultTemplate,
  TestResultParams,
  createStudyReminderTemplate,
  createWeeklySummaryTemplate,
  WeeklySummaryParams,
  createSecurityAlertTemplate,
  SecurityAlertParams,
} from '@cdsprep/email';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly emailProvider: EmailProvider;
  private readonly isEnabled: boolean;
  private readonly defaultFrom: string;

  constructor() {
    this.isEnabled = process.env.ENABLE_EMAIL === 'true';
    const providerName = process.env.EMAIL_PROVIDER || 'mock';
    const apiKey = process.env.EMAIL_API_KEY;
    this.defaultFrom = process.env.EMAIL_FROM || 'notifications@cdsprep.com';

    this.emailProvider = getEmailProvider({
      provider: this.isEnabled ? providerName : 'mock',
      apiKey,
      defaultFrom: this.defaultFrom,
    });

    this.logger.log(
      `EmailService initialized with provider: ${this.emailProvider.providerName} (enabled: ${this.isEnabled})`,
    );
  }

  getProvider(): EmailProvider {
    return this.emailProvider;
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    verificationCode: string,
    verificationUrl?: string,
  ): Promise<boolean> {
    try {
      const template = createEmailVerificationTemplate({
        name,
        verificationCode,
        verificationUrl,
      });

      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: 'Verify Your Cadet Account - CDSPrep',
        html: template.html,
        text: template.text,
      });

      if (!res.success) {
        this.logger.warn(`Failed to send verification email to [redacted]: ${res.error}`);
        return false;
      }
      return true;
    } catch (err: unknown) {
      this.logger.error(`Error sending verification email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
    ipAddress?: string,
  ): Promise<boolean> {
    try {
      const template = createPasswordResetTemplate({
        name,
        resetUrl,
        ipAddress,
      });

      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: 'Reset Your Password - CDSPrep',
        html: template.html,
        text: template.text,
      });

      if (!res.success) {
        this.logger.warn(`Failed to send password reset email: ${res.error}`);
        return false;
      }
      return true;
    } catch (err: unknown) {
      this.logger.error(`Error sending password reset email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendPasswordChangedEmail(
    to: string,
    name: string,
    ipAddress?: string,
    device?: string,
  ): Promise<boolean> {
    try {
      const template = createPasswordChangedTemplate({
        name,
        changeTimestamp: new Date().toUTCString(),
        ipAddress,
        device,
      });

      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: 'Security Alert: Password Updated - CDSPrep',
        html: template.html,
        text: template.text,
      });

      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending password changed notification: ${(err as Error).message}`);
      return false;
    }
  }

  async sendWelcomeCadetEmail(
    to: string,
    name: string,
    targetAcademy: string,
    loginUrl = 'https://cdsprep.com/login',
  ): Promise<boolean> {
    try {
      const template = createWelcomeCadetTemplate({
        name,
        targetAcademy,
        loginUrl,
      });

      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: 'Welcome to the CDSPrep Cadre! Mission Brief',
        html: template.html,
        text: template.text,
      });

      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending welcome email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendTestResultEmail(to: string, params: TestResultParams): Promise<boolean> {
    try {
      const template = createTestResultTemplate(params);
      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: `Test Debrief: ${params.testTitle} - CDSPrep`,
        html: template.html,
        text: template.text,
      });
      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending test result email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendStudyReminderEmail(to: string, name: string, currentStreak: number): Promise<boolean> {
    try {
      const template = createStudyReminderTemplate({
        name,
        currentStreak,
        practiceUrl: 'https://cdsprep.com/practice',
      });
      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: `Protect Your ${currentStreak}-Day Study Streak! - CDSPrep`,
        html: template.html,
        text: template.text,
      });
      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending study reminder email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendWeeklySummaryEmail(to: string, params: WeeklySummaryParams): Promise<boolean> {
    try {
      const template = createWeeklySummaryTemplate(params);
      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: 'Weekly Cadet Mission Debrief - CDSPrep',
        html: template.html,
        text: template.text,
      });
      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending weekly summary email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendSecurityAlertEmail(to: string, params: SecurityAlertParams): Promise<boolean> {
    try {
      const template = createSecurityAlertTemplate(params);
      const res = await this.emailProvider.sendEmail({
        to,
        from: this.defaultFrom,
        subject: `Security Alert: ${params.eventType} - CDSPrep`,
        html: template.html,
        text: template.text,
      });
      return res.success;
    } catch (err: unknown) {
      this.logger.error(`Error sending security alert email: ${(err as Error).message}`);
      return false;
    }
  }

  async sendRawEmail(message: EmailMessage) {
    return this.emailProvider.sendEmail(message);
  }
}
