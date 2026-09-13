import { renderEmailLayout } from './layout';

export interface WeeklySummaryParams {
  name: string;
  questionsSolved: number;
  testsCompleted: number;
  averageAccuracy: number;
  studyHours: number;
  topWeakSubject?: string;
  analyticsUrl: string;
}

export function createWeeklySummaryTemplate(params: WeeklySummaryParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Weekly Cadet Mission Debrief</h2>
    <p>Jai Hind, Cadet <strong>${params.name}</strong>,</p>
    <p>Here is your 7-day CDS preparation summary and performance intelligence:</p>

    <div style="background-color:#0f172a;border-radius:8px;padding:20px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;color:#cbd5e1;font-size:14px;">
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:10px 0;">Questions Attempted</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#38bdf8;">${params.questionsSolved}</td>
        </tr>
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:10px 0;">Mock Tests Finished</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#38bdf8;">${params.testsCompleted}</td>
        </tr>
        <tr style="border-bottom:1px solid #334155;">
          <td style="padding:10px 0;">Overall Accuracy</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#22c55e;">${params.averageAccuracy.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="padding:10px 0;">Practice Time</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#f59e0b;">${params.studyHours.toFixed(1)} Hours</td>
        </tr>
      </table>
    </div>

    ${
      params.topWeakSubject
        ? `<p style="font-size:14px;color:#fca5a5;"><strong>Focus Area for Upcoming Week:</strong> Recommended drill in <em>${params.topWeakSubject}</em> to bolster cut-off clearance.</p>`
        : ''
    }

    <div style="text-align:center;">
      <a href="${params.analyticsUrl}" class="btn">View Full Analytics Dashboard</a>
    </div>
  `;

  const contentText = `Jai Hind, Cadet ${params.name},\n\n` +
    `Your weekly CDSPrep summary:\n` +
    `- Questions Solved: ${params.questionsSolved}\n` +
    `- Tests Completed: ${params.testsCompleted}\n` +
    `- Average Accuracy: ${params.averageAccuracy.toFixed(1)}%\n` +
    `- Practice Time: ${params.studyHours.toFixed(1)} hrs\n` +
    (params.topWeakSubject ? `- Focus Subject: ${params.topWeakSubject}\n` : '') +
    `\nDeep dive into your performance: ${params.analyticsUrl}`;

  return renderEmailLayout({
    title: 'Weekly Cadet Intelligence Brief',
    preheader: `Your weekly CDS performance: ${params.questionsSolved} questions solved, ${params.averageAccuracy.toFixed(1)}% accuracy.`,
    contentHtml,
    contentText,
  });
}
