import { renderEmailLayout } from './layout';

export interface SecurityAlertParams {
  name: string;
  eventType: string;
  timestamp: string;
  ipAddress?: string;
  location?: string;
  device?: string;
  actionUrl: string;
}

export function createSecurityAlertTemplate(params: SecurityAlertParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#ef4444;font-size:20px;">Security Alert: ${params.eventType}</h2>
    <p>Jai Hind, <strong>${params.name}</strong>,</p>
    <p>We detected security activity on your CDSPrep cadet account:</p>

    <div style="background-color:#0f172a;border-left:4px solid #ef4444;padding:16px;margin:20px 0;border-radius:4px;">
      <p style="margin:4px 0;font-size:13px;color:#cbd5e1;"><strong>Event:</strong> ${params.eventType}</p>
      <p style="margin:4px 0;font-size:13px;color:#cbd5e1;"><strong>Time:</strong> ${params.timestamp}</p>
      ${params.ipAddress ? `<p style="margin:4px 0;font-size:13px;color:#cbd5e1;"><strong>IP Address:</strong> ${params.ipAddress}</p>` : ''}
      ${params.location ? `<p style="margin:4px 0;font-size:13px;color:#cbd5e1;"><strong>Location:</strong> ${params.location}</p>` : ''}
      ${params.device ? `<p style="margin:4px 0;font-size:13px;color:#cbd5e1;"><strong>Device/Browser:</strong> ${params.device}</p>` : ''}
    </div>

    <p style="font-size:14px;color:#fca5a5;">If this was you, you can safely ignore this notification. If you did NOT initiate this action, please lock your account immediately.</p>

    <div style="text-align:center;">
      <a href="${params.actionUrl}" class="btn" style="background:#dc2626;">Secure My Account Immediately</a>
    </div>
  `;

  const contentText = `Jai Hind, ${params.name},\n\n` +
    `SECURITY ALERT: ${params.eventType}\n` +
    `- Time: ${params.timestamp}\n` +
    (params.ipAddress ? `- IP: ${params.ipAddress}\n` : '') +
    (params.location ? `- Location: ${params.location}\n` : '') +
    (params.device ? `- Device: ${params.device}\n` : '') +
    `\nIf this was NOT you, secure your account immediately:\n${params.actionUrl}\n`;

  return renderEmailLayout({
    title: `Security Alert: ${params.eventType}`,
    preheader: `Security notice regarding your CDSPrep account: ${params.eventType}`,
    contentHtml,
    contentText,
  });
}
