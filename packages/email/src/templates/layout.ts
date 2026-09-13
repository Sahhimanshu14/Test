export interface EmailLayoutOptions {
  title: string;
  preheader?: string;
  contentHtml: string;
  contentText: string;
}

export function renderEmailLayout(options: EmailLayoutOptions): { html: string; text: string } {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${options.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #0f172a;
      color: #e2e8f0;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .card {
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 32px 24px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    .brand {
      text-align: center;
      margin-bottom: 24px;
    }
    .brand-title {
      color: #38bdf8;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .brand-sub {
      color: #94a3b8;
      font-size: 13px;
      margin-top: 4px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    .code-box {
      background-color: #0f172a;
      border: 1px solid #38bdf8;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #38bdf8;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      color: #64748b;
      font-size: 12px;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${options.preheader ? `<div style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.preheader}</div>` : ''}
  <div class="wrapper">
    <div class="brand">
      <h1 class="brand-title">CDSPrep</h1>
      <p class="brand-sub">UPSC Combined Defence Services Examination Prep</p>
    </div>
    <div class="card">
      ${options.contentHtml}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} CDSPrep Platform. All rights reserved.</p>
      <p>This is an automated operational notification. For support, contact <a href="mailto:support@cdsprep.com">support@cdsprep.com</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `=== CDSPrep: ${options.title} ===\n\n` +
    options.contentText +
    `\n\n---\n(c) ${new Date().getFullYear()} CDSPrep. Contact support@cdsprep.com`;

  return { html, text };
}
