import { renderEmailLayout } from './layout';

export interface TestResultParams {
  name: string;
  testTitle: string;
  netScore: number;
  totalMarks: number;
  accuracyPercent: number;
  rank?: number;
  totalCadets?: number;
  reviewUrl: string;
}

export function createTestResultTemplate(params: TestResultParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Mock Test Debrief: ${params.testTitle}</h2>
    <p>Jai Hind, Cadet <strong>${params.name}</strong>,</p>
    <p>Your performance report for <strong>${params.testTitle}</strong> has been evaluated under UPSC CDS standards.</p>
    
    <div style="display:flex;justify-content:space-around;background-color:#0f172a;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <div style="flex:1;">
        <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;">Net Score</div>
        <div style="font-size:26px;font-weight:800;color:#38bdf8;">${params.netScore.toFixed(2)} / ${params.totalMarks}</div>
      </div>
      <div style="flex:1;">
        <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;">Accuracy</div>
        <div style="font-size:26px;font-weight:800;color:#22c55e;">${params.accuracyPercent.toFixed(1)}%</div>
      </div>
      ${
        params.rank && params.totalCadets
          ? `<div style="flex:1;">
               <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;">AIR Rank</div>
               <div style="font-size:26px;font-weight:800;color:#f59e0b;">#${params.rank} / ${params.totalCadets}</div>
             </div>`
          : ''
      }
    </div>

    <div style="text-align:center;">
      <a href="${params.reviewUrl}" class="btn">Review Mistakes & AI Explanations</a>
    </div>
    
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Reviewing every mistake within 24 hours increases retention by 80%.</p>
  `;

  const contentText = `Jai Hind, Cadet ${params.name},\n\n` +
    `Your test report for ${params.testTitle} is ready:\n` +
    `- Net Score: ${params.netScore.toFixed(2)} / ${params.totalMarks}\n` +
    `- Accuracy: ${params.accuracyPercent.toFixed(1)}%\n` +
    (params.rank ? `- Rank: #${params.rank} of ${params.totalCadets}\n` : '') +
    `\nReview your full test debrief here: ${params.reviewUrl}\n`;

  return renderEmailLayout({
    title: `Test Debrief: ${params.testTitle}`,
    preheader: `Your score for ${params.testTitle}: ${params.netScore.toFixed(2)} (${params.accuracyPercent.toFixed(1)}% accuracy)`,
    contentHtml,
    contentText,
  });
}
