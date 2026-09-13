export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  id?: string;
  success: boolean;
  error?: string;
}

export interface EmailProvider {
  readonly providerName: string;
  sendEmail(message: EmailMessage): Promise<SendEmailResult>;
}
