// Resend email integration using RESEND_API_KEY secret
import { Resend } from 'resend';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const FROM_EMAIL = 'HabitBuilder.pro <admin@habitbuilder.pro>';

export async function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY secret is not set');
  }
  return {
    client: new Resend(apiKey),
    fromEmail: FROM_EMAIL
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text ? { text } : {}),
  });

  return result;
}

const EMAIL_HEADER = `
  <div style="text-align: center; margin-bottom: 24px;">
    <h1 style="color: #0a1628; font-size: 24px; margin: 0;">
      <span style="color: #0a1628;">Habit</span><span style="color: #059669;">Builder</span><span style="color: #0a1628;">.pro</span>
    </h1>
  </div>
`;

const EMAIL_FOOTER = `
  <p style="color: #888; font-size: 12px; text-align: center; margin-top: 32px;">
    Sent via <a href="https://habitbuilder.pro" style="color: #059669;">HabitBuilder.pro</a> - Build habits that actually stick
  </p>
`;

function wrapEmail(content: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      ${EMAIL_HEADER}
      ${content}
      ${EMAIL_FOOTER}
    </div>
  `;
}

export async function sendAccountabilityInviteEmail(params: {
  toEmail: string;
  partnerName?: string;
  inviterName: string;
  inviterEmail: string;
  habitTitles: string[];
  inviteToken?: string;
}) {
  const habitList = params.habitTitles.length > 0
    ? params.habitTitles.map(h => `<li>${escapeHtml(h)}</li>`).join('')
    : '<li>All habits</li>';

  const acceptUrl = params.inviteToken
    ? `https://habitbuilder.pro/accept-invite/${params.inviteToken}`
    : 'https://habitbuilder.pro';

  const html = wrapEmail(`
    <h2 style="color: #1a1a2e; margin-bottom: 16px;">You've been invited as an Accountability Partner!</h2>
    <p style="color: #444; line-height: 1.6;">
      <strong>${escapeHtml(params.inviterName)}</strong> (${escapeHtml(params.inviterEmail)}) wants you to be their accountability partner on HabitBuilder.pro.
    </p>
    <p style="color: #444; line-height: 1.6;">They're working on:</p>
    <ul style="color: #444; line-height: 1.8;">${habitList}</ul>
    <p style="color: #444; line-height: 1.6;">
      As their accountability partner, you'll receive progress updates and help them stay on track with their goals.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${acceptUrl}" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Accept Invitation
      </a>
    </div>
    <p style="color: #888; font-size: 13px; text-align: center;">
      Or copy this link: ${escapeHtml(acceptUrl)}
    </p>
  `);

  return sendEmail({
    to: params.toEmail,
    subject: `${params.inviterName} invited you as an Accountability Partner`,
    html,
  });
}

export async function sendProgressUpdateEmail(params: {
  toEmail: string;
  partnerName?: string;
  senderName: string;
  habits: { title: string; streak: number; timeSpent: number }[];
}) {
  const habitRows = params.habits.map(h => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(h.title)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${h.streak} days</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${Math.floor(h.timeSpent / 60)}h ${h.timeSpent % 60}m</td>
    </tr>
  `).join('');

  const html = wrapEmail(`
    <h2 style="color: #1a1a2e; margin-bottom: 16px;">Progress Update from ${escapeHtml(params.senderName)}</h2>
    <p style="color: #444; line-height: 1.6;">
      ${params.partnerName ? `Hey ${escapeHtml(params.partnerName)}!` : 'Hey!'} Here's a progress update from your accountability partner <strong>${escapeHtml(params.senderName)}</strong>:
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 8px 12px; text-align: left;">Habit</th>
          <th style="padding: 8px 12px; text-align: center;">Streak</th>
          <th style="padding: 8px 12px; text-align: center;">Time Invested</th>
        </tr>
      </thead>
      <tbody>${habitRows}</tbody>
    </table>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://habitbuilder.pro" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Start Your Own Journey
      </a>
    </div>
  `);

  return sendEmail({
    to: params.toEmail,
    subject: `${params.senderName}'s Habit Progress Update`,
    html,
  });
}

export async function sendAdminBulkEmail(params: {
  toEmails: string[];
  subject: string;
  body: string;
}) {
  const { client, fromEmail } = await getResendClient();

  const html = wrapEmail(`
    <div style="color: #333; line-height: 1.7; font-size: 15px;">
      ${escapeHtml(params.body).replace(/\n/g, '<br/>')}
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://habitbuilder.pro" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Open HabitBuilder.pro
      </a>
    </div>
  `);

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < params.toEmails.length; i++) {
    const email = params.toEmails[i];
    try {
      const sendResult = await client.emails.send({
        from: fromEmail,
        to: email,
        subject: params.subject,
        html,
      });
      console.log(`Email sent to ${email}:`, JSON.stringify(sendResult));
      if (sendResult.error) {
        results.failed++;
        results.errors.push(`${email}: ${sendResult.error.message}`);
      } else {
        results.sent++;
      }
    } catch (err: any) {
      console.error(`Email error for ${email}:`, err.message);
      results.failed++;
      results.errors.push(`${email}: ${err.message}`);
    }
    if (i < params.toEmails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  return results;
}

export async function sendDailyReminderEmail(params: {
  toEmail: string;
  userName: string;
  todayTasks: { habitTitle: string; taskTitle: string }[];
  currentStreak: number;
  unsubscribeNote?: string;
}) {
  const taskList = params.todayTasks.length > 0
    ? params.todayTasks.map(t => `<li style="padding: 4px 0;"><strong>${escapeHtml(t.habitTitle)}</strong>: ${escapeHtml(t.taskTitle)}</li>`).join('')
    : '<li style="padding: 4px 0; color: #888;">No specific tasks scheduled - check your dashboard!</li>';

  const streakText = params.currentStreak > 0
    ? `<p style="color: #059669; font-weight: 600; font-size: 18px; text-align: center; margin: 16px 0;">Current Streak: ${params.currentStreak} day${params.currentStreak !== 1 ? 's' : ''}</p>`
    : '';

  const html = wrapEmail(`
    <h2 style="color: #1a1a2e; margin-bottom: 8px;">Good morning${params.userName ? ', ' + escapeHtml(params.userName) : ''}!</h2>
    <p style="color: #444; line-height: 1.6;">Here's what's on your plate today:</p>
    ${streakText}
    <div style="background: #f8faf9; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="font-weight: 600; color: #333; margin-bottom: 8px;">Today's Focus:</p>
      <ul style="color: #444; line-height: 1.8; margin: 0; padding-left: 20px;">${taskList}</ul>
    </div>
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://habitbuilder.pro" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        Start Your Day
      </a>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center;">
      To stop receiving daily reminders, visit your Account settings on HabitBuilder.pro.
    </p>
  `);

  return sendEmail({
    to: params.toEmail,
    subject: params.currentStreak > 0 
      ? `Keep your ${params.currentStreak}-day streak alive!`
      : `Your habits are waiting for you today`,
    html,
  });
}

export async function sendWeeklyDigestEmail(params: {
  toEmail: string;
  userName: string;
  weekStats: {
    habitsWorkedOn: number;
    sessionsCompleted: number;
    totalMinutes: number;
    longestStreak: number;
    completionRate: number;
  };
  topHabit?: string;
  moodSummary?: string;
}) {
  const stats = params.weekStats;
  const html = wrapEmail(`
    <h2 style="color: #1a1a2e; margin-bottom: 8px;">Your Weekly Progress Report</h2>
    <p style="color: #444; line-height: 1.6;">
      ${params.userName ? escapeHtml(params.userName) + ', here' : 'Here'}'s how your week went:
    </p>
    <div style="background: #f8faf9; border-radius: 8px; padding: 20px; margin: 16px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #666;">Habits Worked On</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e;">${stats.habitsWorkedOn}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; border-top: 1px solid #e5e7eb;">Sessions Completed</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; border-top: 1px solid #e5e7eb;">${stats.sessionsCompleted}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; border-top: 1px solid #e5e7eb;">Time Invested</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; border-top: 1px solid #e5e7eb;">${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; border-top: 1px solid #e5e7eb;">Longest Streak</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #059669; border-top: 1px solid #e5e7eb;">${stats.longestStreak} days</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #666; border-top: 1px solid #e5e7eb;">Completion Rate</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; border-top: 1px solid #e5e7eb;">${stats.completionRate}%</td>
        </tr>
      </table>
    </div>
    ${params.topHabit ? `<p style="color: #444; line-height: 1.6;">Your top habit this week: <strong>${escapeHtml(params.topHabit)}</strong></p>` : ''}
    ${params.moodSummary ? `<p style="color: #444; line-height: 1.6;">Mood trend: ${escapeHtml(params.moodSummary)}</p>` : ''}
    <div style="text-align: center; margin: 24px 0;">
      <a href="https://habitbuilder.pro" style="background-color: #059669; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
        View Full Analytics
      </a>
    </div>
    <p style="color: #999; font-size: 12px; text-align: center;">
      To stop receiving weekly digests, visit your Account settings on HabitBuilder.pro.
    </p>
  `);

  return sendEmail({
    to: params.toEmail,
    subject: `Your Week in Review - ${stats.sessionsCompleted} sessions completed`,
    html,
  });
}
