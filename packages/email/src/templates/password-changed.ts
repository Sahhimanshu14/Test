import { renderEmailLayout } from './layout';

export interface PasswordChangedParams {
  name: string;
  changeTimestamp: string;
  device?: string;
  ipAddress?: string;
}

export function createPasswordChangedTemplate(params: PasswordChangedParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Password Changed Successfully</h2>
    <p>Jai Hind, <strong>${params.name}</strong>,</p>
    <p>Your CDSPrep account password was successfully updated on <strong>${params.changeTimestamp}</strong>.</p>
    ${params.device ? `<p style="font-size:13px;color:#94a3b8;">Device: ${params.device}</p>` : ''}
    ${params.ipAddress ? `<p style="font-size:13px;color:#94a3b8;">IP Address: ${params.ipAddress}</p>` : ''}
    <div style="background-color:#0f172a;border-left:4px solid #ef4444;padding:12px;margin:20px 0;border-radius:4px;">
      <p style="margin:0;font-size:13px;color:#fca5a5;">
        <strong>Didn't make this change?</strong> Your account may be compromised. Please reset your password immediately or contact our emergency support at <a href="mailto:security@cdsprep.com" style="color:#38bdf8;">security@cdsprep.com</a>.
      </p>
    </div>
  `;

  const contentText = `Jai Hind, ${params.name},\n\n` +
    `Your CDSPrep account password was successfully updated on ${params.changeTimestamp}.\n` +
    (params.device ? `Device: ${params.device}\n` : '') +
    (params.ipAddress ? `IP Address: ${params.ipAddress}\n` : '') +
    `\nIf you did NOT make this change, please contact security@cdsprep.com immediately.`;

  return renderEmailLayout({
    title: 'Security Alert: Password Updated',
    preheader: 'Your CDSPrep password was changed successfully',
    contentHtml,
    contentText,
  });
}
