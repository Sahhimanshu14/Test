import { renderEmailLayout } from './layout';

export interface PasswordResetParams {
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
  ipAddress?: string;
}

export function createPasswordResetTemplate(params: PasswordResetParams) {
  const expiry = params.expiresInMinutes || 15;

  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Reset Your Password</h2>
    <p>Jai Hind, <strong>${params.name}</strong>,</p>
    <p>We received a request to reset your CDSPrep account password.</p>
    <div style="text-align:center;">
      <a href="${params.resetUrl}" class="btn">Reset My Password</a>
    </div>
    <p style="font-size:13px;color:#94a3b8;word-break:break-all;">Or copy and paste this link into your browser:<br><a href="${params.resetUrl}" style="color:#38bdf8;">${params.resetUrl}</a></p>
    <p style="font-size:13px;color:#94a3b8;">This password reset link will expire in <strong>${expiry} minutes</strong>.</p>
    ${params.ipAddress ? `<p style="font-size:12px;color:#64748b;">Request initiated from IP: ${params.ipAddress}</p>` : ''}
    <p style="font-size:13px;color:#ef4444;">If you did not request this password reset, please secure your account immediately or notify support.</p>
  `;

  const contentText = `Jai Hind, ${params.name},\n\n` +
    `We received a request to reset your password. Use the link below to set a new password:\n\n` +
    `${params.resetUrl}\n\n` +
    `This link will expire in ${expiry} minutes.\n` +
    (params.ipAddress ? `Request IP: ${params.ipAddress}\n\n` : '') +
    `If you did not make this request, please contact support immediately.`;

  return renderEmailLayout({
    title: 'Password Reset Request',
    preheader: 'Reset your CDSPrep account password',
    contentHtml,
    contentText,
  });
}
