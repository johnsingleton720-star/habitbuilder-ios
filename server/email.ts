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

const TEST_EMAIL_DOMAINS = ['@example.com', '@test.com', '@example.org'];

function isTestEmail(email: string): boolean {
  return TEST_EMAIL_DOMAINS.some(domain => email.toLowerCase().endsWith(domain));
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
  try {
    const recipients = (Array.isArray(to) ? to : [to]).filter(email => {
      if (isTestEmail(email)) {
        console.log(`[Email] Skipping test email address: ${email}`);
        return false;
      }
      return true;
    });

    if (recipients.length === 0) {
      console.log('[Email] No valid recipients after filtering test addresses, skipping send');
      return { data: null, error: null };
    }

    const { client, fromEmail } = await getResendClient();

    const result = await client.emails.send({
      from: fromEmail,
      to: recipients,
      subject,
      html,
      ...(text ? { text } : {}),
    });

    return result;
  } catch (err: any) {
    console.error('sendEmail failed:', err?.message || err);
    throw err;
  }
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

export async function sendWelcomeCampaignEmail(params: {
  toEmails: string[];
}) {
  const { client, fromEmail } = await getResendClient();

  const html = wrapEmail(`
    <div style="text-align: center; margin-bottom: 28px;">
      <h2 style="color: #1a1a2e; font-size: 22px; margin: 0 0 8px 0;">Welcome to HabitBuilder.pro!</h2>
      <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0;">
        We're so glad you're here. Building better habits is one of the most powerful things you can do for yourself, and we're here to help you every step of the way.
      </p>
    </div>

    <div style="background: linear-gradient(135deg, #f0fdf4, #ecfeff); border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #065f46; font-size: 16px; margin: 0 0 12px 0;">&#127793; What You Can Do Right Now</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #333; font-size: 14px; line-height: 1.5;">&#10003; <strong>AI-powered coaching</strong> — get a personalized action plan for your habit</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #333; font-size: 14px; line-height: 1.5;">&#10003; <strong>Daily & weekly plans</strong> — know exactly what to do each day</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #333; font-size: 14px; line-height: 1.5;">&#10003; <strong>Quick tasks</strong> — a personal checklist to keep you on track</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #333; font-size: 14px; line-height: 1.5;">&#10003; <strong>Streak tracking</strong> — watch your consistency grow day by day</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #333; font-size: 14px; line-height: 1.5;">&#10003; <strong>Achievements & XP</strong> — earn rewards as you build your habits</td>
        </tr>
      </table>
    </div>

    <div style="background: linear-gradient(135deg, #eff6ff, #f5f3ff); border: 1px solid #c4b5fd; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <h3 style="color: #4338ca; font-size: 16px; margin: 0 0 4px 0;">&#128640; Unlock Your Full Potential</h3>
      <p style="color: #555; font-size: 13px; margin: 0 0 14px 0;">When you're ready for more, Pro and Premium give you the complete toolkit:</p>

      <div style="background: white; border-radius: 8px; padding: 14px; margin-bottom: 12px; border: 1px solid #e0e7ff;">
        <p style="color: #4338ca; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">&#11088; Pro Plan</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Unlimited habits</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Mood tracker & daily journal</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Focus timer & analytics</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Adaptive AI coaching check-ins</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Smart plan adjustment when things aren't working</td></tr>
        </table>
      </div>

      <div style="background: white; border-radius: 8px; padding: 14px; border: 1px solid #e0e7ff;">
        <p style="color: #7c3aed; font-weight: 700; font-size: 14px; margin: 0 0 8px 0;">&#128081; Premium Plan</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Everything in Pro, plus...</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Habit stacking & advanced analytics</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; AI-generated insights & weekly reports</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Community forum & direct messaging</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Accountability partners</td></tr>
          <tr><td style="padding: 3px 0; color: #444; font-size: 13px;">&#8226; Custom accent colors & XP multipliers</td></tr>
        </table>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="https://habitbuilder.pro/account" style="background: linear-gradient(135deg, #059669, #0d9488); color: white; padding: 14px 36px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
        Explore Upgrade Options
      </a>
    </div>

    <div style="background: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 18px; margin-bottom: 24px; text-align: center;">
      <h3 style="color: #92400e; font-size: 15px; margin: 0 0 8px 0;">&#128172; We'd Love Your Feedback</h3>
      <p style="color: #78350f; font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
        HabitBuilder.pro is built for people like you. If you have ideas, run into something confusing, or just want to say hi — we genuinely want to hear from you.
      </p>
      <a href="https://habitbuilder.pro/account" style="color: #059669; font-weight: 600; font-size: 13px; text-decoration: underline;">
        Share Your Thoughts
      </a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center; line-height: 1.6; margin-top: 20px;">
      Your journey to better habits starts with a single step. We're cheering you on! &#127942;
    </p>
  `);

  const results = { sent: 0, failed: 0, errors: [] as string[] };

  for (let i = 0; i < params.toEmails.length; i++) {
    const email = params.toEmails[i];
    try {
      const sendResult = await client.emails.send({
        from: fromEmail,
        to: email,
        subject: "Welcome to HabitBuilder.pro — Here's What You Can Do Today",
        html,
      });
      console.log(`Welcome campaign email sent to ${email}:`, JSON.stringify(sendResult));
      if (sendResult.error) {
        results.failed++;
        results.errors.push(`${email}: ${sendResult.error.message}`);
      } else {
        results.sent++;
      }
    } catch (err: any) {
      console.error(`Welcome campaign email error for ${email}:`, err.message);
      results.failed++;
      results.errors.push(`${email}: ${err.message}`);
    }
    if (i < params.toEmails.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  }

  return results;
}
