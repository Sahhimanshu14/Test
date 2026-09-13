import { renderEmailLayout } from './layout';

export interface StudyReminderParams {
  name: string;
  currentStreak: number;
  practiceUrl: string;
}

export function createStudyReminderTemplate(params: StudyReminderParams) {
  const contentHtml = `
    <h2 style="margin-top:0;color:#f8fafc;font-size:20px;">Protect Your ${params.currentStreak}-Day Study Streak!</h2>
    <p>Jai Hind, Cadet <strong>${params.name}</strong>,</p>
    <p>Consistency is the hallmark of every officer. You currently hold a <strong>${params.currentStreak}-day study streak</strong> on CDSPrep.</p>
    <p>Solve at least 5 PYQ or practice questions today before 23:59 IST to preserve your momentum and badge progression.</p>
    <div style="text-align:center;">
      <a href="${params.practiceUrl}" class="btn">Start Daily Practice Session</a>
    </div>
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Small daily disciplines yield massive rank breakthroughs.</p>
  `;

  const contentText = `Jai Hind, Cadet ${params.name},\n\n` +
    `You currently have a ${params.currentStreak}-day study streak on CDSPrep.\n\n` +
    `Solve at least 5 questions today to keep your streak alive!\n\n` +
    `Practice now: ${params.practiceUrl}`;

  return renderEmailLayout({
    title: 'Daily Streak Reminder',
    preheader: `Cadet ${params.name}, protect your ${params.currentStreak}-day CDSPrep streak!`,
    contentHtml,
    contentText,
  });
}
