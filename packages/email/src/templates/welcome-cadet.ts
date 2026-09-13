import { renderEmailLayout } from './layout';

export interface WelcomeCadetParams {
  name: string;
  targetAcademy: string;
  loginUrl: string;
}

export function createWelcomeCadetTemplate(params: WelcomeCadetParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Welcome to the CDSPrep Cadre!</h2>
    <p>Jai Hind, Cadet <strong>${params.name}</strong>,</p>
    <p>Congratulations on taking the first decisive step toward earning your commission at <strong>${params.targetAcademy}</strong>.</p>
    <div style="background-color:#0f172a;border-radius:8px;padding:16px;margin:20px 0;">
      <h3 style="margin-top:0;color:#38bdf8;font-size:16px;">What you have access to:</h3>
      <ul style="color:#cbd5e1;padding-left:20px;margin-bottom:0;">
        <li>Full UPSC CDS syllabus-aligned question bank</li>
        <li>10+ Years of authentic PYQs with official answer keys</li>
        <li>Full-length timed mock tests with strict UPSC negative marking (-0.33)</li>
        <li>AI-powered pedagogical explanations & weak topic diagnostics</li>
        <li>Cadet rank leaderboards & daily streak tracking</li>
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="${params.loginUrl}" class="btn">Launch Your Mission Dashboard</a>
    </div>
    <p style="font-size:14px;color:#94a3b8;text-align:center;font-style:italic;">"Service Before Self" &bull; "Veerta Aur Vivek"</p>
  `;

  const contentText = `Jai Hind, Cadet ${params.name},\n\n` +
    `Welcome to CDSPrep! Your mission toward ${params.targetAcademy} begins now.\n\n` +
    `Access your dashboard here: ${params.loginUrl}\n\n` +
    `Disciplined preparation yields officer qualities. Train daily!`;

  return renderEmailLayout({
    title: 'Welcome Cadet to CDSPrep',
    preheader: `Welcome to CDSPrep, Cadet ${params.name}! Your mission begins now.`,
    contentHtml,
    contentText,
  });
}
