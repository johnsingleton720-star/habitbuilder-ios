import { db } from "./db";
import { users, habits } from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { sendDailyReminderEmail, sendWeeklyDigestEmail } from "./email";

function getUserLocalTime(timezone: string | null): { hour: number; minute: number; dayOfWeek: number; dateStr: string } {
  const tz = timezone || "America/Chicago";
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
    const weekday = parts.find(p => p.type === "weekday")?.value || "Mon";
    const year = parts.find(p => p.type === "year")?.value || "2026";
    const month = parts.find(p => p.type === "month")?.value || "01";
    const day = parts.find(p => p.type === "day")?.value || "01";
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      hour,
      minute,
      dayOfWeek: dayMap[weekday] ?? 1,
      dateStr: `${year}-${month}-${day}`,
    };
  } catch {
    const now = new Date();
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateStr: now.toISOString().split("T")[0],
    };
  }
}

async function processDailyReminders() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(eq(users.dailyReminderEnabled, true), isNotNull(users.email)),
    });

    let sent = 0;
    for (const u of eligibleUsers) {
      if (!u.email) continue;

      const localTime = getUserLocalTime(u.timezone);
      const preferredTime = u.dailyReminderTime || "08:00";
      const [prefHour, prefMinute] = preferredTime.split(":").map(Number);

      if (localTime.hour !== prefHour) continue;
      if (localTime.minute > (prefMinute + 14)) continue;

      if (u.lastDailyReminderSent === localTime.dateStr) continue;

      try {
        const userHabits = await db.query.habits.findMany({
          where: eq(habits.userId, u.id),
        });

        const todayTasks: { habitTitle: string; taskTitle: string }[] = [];
        let maxStreak = 0;

        for (const habit of userHabits) {
          if (habit.currentStreak && habit.currentStreak > maxStreak) maxStreak = habit.currentStreak;
          const plans = habit.dailyPlans as any[];
          if (plans && Array.isArray(plans)) {
            for (const plan of plans.slice(0, 2)) {
              const taskTitle = typeof plan === "string" ? plan : plan.title || plan.task || "Check your plan";
              todayTasks.push({ habitTitle: habit.title, taskTitle });
            }
          }
        }

        await sendDailyReminderEmail({
          toEmail: u.email,
          userName: u.firstName || "",
          todayTasks: todayTasks.slice(0, 5),
          currentStreak: maxStreak,
        });

        await db.update(users).set({ lastDailyReminderSent: localTime.dateStr }).where(eq(users.id, u.id));
        sent++;
        console.log(`[EmailScheduler] Daily reminder sent to ${u.email}`);
      } catch (err) {
        console.error(`[EmailScheduler] Failed daily reminder for ${u.email}:`, err);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    if (sent > 0) {
      console.log(`[EmailScheduler] Daily reminders: ${sent} sent`);
    }
  } catch (error) {
    console.error("[EmailScheduler] Error processing daily reminders:", error);
  }
}

async function processWeeklyDigests() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(eq(users.weeklyDigestEnabled, true), isNotNull(users.email)),
    });

    let sent = 0;
    for (const u of eligibleUsers) {
      if (!u.email) continue;

      const localTime = getUserLocalTime(u.timezone);
      if (localTime.dayOfWeek !== 0) continue;
      if (localTime.hour !== 9) continue;

      const weekId = `${localTime.dateStr}`;
      if (u.lastWeeklyDigestSent === weekId) continue;

      try {
        const userHabits = await db.query.habits.findMany({
          where: eq(habits.userId, u.id),
        });

        let totalMinutes = 0;
        let longestStreak = 0;
        let topHabit = "";
        let topHabitStreak = 0;

        for (const habit of userHabits) {
          if (habit.currentStreak && habit.currentStreak > longestStreak) longestStreak = habit.currentStreak;
          if (habit.totalTimeSpent) totalMinutes += habit.totalTimeSpent;
          if (habit.currentStreak && habit.currentStreak > topHabitStreak) {
            topHabitStreak = habit.currentStreak;
            topHabit = habit.title;
          }
        }

        const progressEntries = userHabits.reduce((acc, h) => {
          const prog = h.progress as any[];
          return acc + (Array.isArray(prog) ? prog.length : 0);
        }, 0);
        const completionRate = userHabits.length > 0 ? Math.min(Math.round((progressEntries / (userHabits.length * 7)) * 100), 100) : 0;

        await sendWeeklyDigestEmail({
          toEmail: u.email,
          userName: u.firstName || "",
          weekStats: {
            habitsWorkedOn: userHabits.length,
            sessionsCompleted: progressEntries,
            totalMinutes,
            longestStreak,
            completionRate,
          },
          topHabit: topHabit || undefined,
        });

        await db.update(users).set({ lastWeeklyDigestSent: weekId }).where(eq(users.id, u.id));
        sent++;
        console.log(`[EmailScheduler] Weekly digest sent to ${u.email}`);
      } catch (err) {
        console.error(`[EmailScheduler] Failed weekly digest for ${u.email}:`, err);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    if (sent > 0) {
      console.log(`[EmailScheduler] Weekly digests: ${sent} sent`);
    }
  } catch (error) {
    console.error("[EmailScheduler] Error processing weekly digests:", error);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startEmailScheduler() {
  if (schedulerInterval) return;

  console.log("[EmailScheduler] Starting email scheduler (checks every 15 minutes)");

  setTimeout(() => {
    processDailyReminders();
    processWeeklyDigests();
  }, 10000);

  schedulerInterval = setInterval(() => {
    processDailyReminders();
    processWeeklyDigests();
  }, 15 * 60 * 1000);
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[EmailScheduler] Stopped");
  }
}
