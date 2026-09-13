import { renderEmailLayout } from './layout';

export interface EmailVerificationParams {
  name: string;
  verificationCode: string;
  verificationUrl?: string;
  expiresInMinutes?: number;
}

export function createEmailVerificationTemplate(params: EmailVerificationParams) {
  const expiry = params.expiresInMinutes || 15;

  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Verify Your CDSPrep Cadet Account</h2>
    <p>Jai Hind, <strong>${params.name}</strong>,</p>
    <p>Welcome to CDSPrep! Please verify your email address to activate your full mock test access, PYQ banks, and AI tutor features.</p>
    <div class="code-box">${params.verificationCode}</div>
    <p style="text-align:center;color:#94a3b8;font-size:13px;">This verification code will expire in ${expiry} minutes.</p>
    ${
      params.verificationUrl
        ? `<div style="text-align:center;"><a href="${params.verificationUrl}" class="btn">Verify Account Directly</a></div>`
        : ''
    }
    <p style="font-size:13px;color:#94a3b8;">If you did not sign up for a CDSPrep account, you can safely disregard this email.</p>
  `;

  const contentText = `Jai Hind, ${params.name},\n\n` +
    `Welcome to CDSPrep! Your verification code is:\n\n` +
    `>>> ${params.verificationCode} <<<\n\n` +
    `This code will expire in ${expiry} minutes.\n` +
    (params.verificationUrl ? `Direct link: ${params.verificationUrl}\n\n` : '') +
    `If you did not request this, please ignore this email.`;

  return renderEmailLayout({
    title: 'Verify Your Cadet Account',
    preheader: `Your CDSPrep verification code is ${params.verificationCode}`,
    contentHtml,
    contentText,
  });
}
