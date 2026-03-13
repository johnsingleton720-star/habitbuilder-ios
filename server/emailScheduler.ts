import { db } from "./db";
import { users, habits, habitReminders, quickTasks, goalMilestones, goals, moodEntries, journalEntries, userAchievements } from "@shared/schema";
import { eq, and, isNotNull, or, gte } from "drizzle-orm";
import { sendDailyReminderEmail, sendWeeklyDigestEmail, sendPaidWeeklyDigestEmail } from "./email";
import { sendPushToUser } from "./pushNotifications";

function getUserLocalTime(timezone: string | null): { hour: number; minute: number; dayOfWeek: number; dateStr: string; dayName: string } {
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
    const dayNameMap: Record<string, string> = { Sun: "sunday", Mon: "monday", Tue: "tuesday", Wed: "wednesday", Thu: "thursday", Fri: "friday", Sat: "saturday" };
    return {
      hour,
      minute,
      dayOfWeek: dayMap[weekday] ?? 1,
      dateStr: `${year}-${month}-${day}`,
      dayName: dayNameMap[weekday] ?? "monday",
    };
  } catch {
    const now = new Date();
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return {
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      dayOfWeek: now.getUTCDay(),
      dateStr: now.toISOString().split("T")[0],
      dayName: days[now.getUTCDay()],
    };
  }
}

function isTimeMatch(localTime: { hour: number; minute: number }, targetTime: string): boolean {
  const [prefHour, prefMinute] = targetTime.split(":").map(Number);
  if (localTime.hour !== prefHour) return false;
  if (localTime.minute > (prefMinute + 14)) return false;
  return true;
}

async function processDailyReminders() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: or(
        and(eq(users.dailyReminderEnabled, true), isNotNull(users.email)),
        eq(users.pushNotificationsEnabled, true)
      ),
    });

    let emailSent = 0;
    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);
      const preferredTime = u.dailyReminderTime || "08:00";

      if (!isTimeMatch(localTime, preferredTime)) continue;
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

        if (u.email && u.dailyReminderEnabled !== false) {
          await sendDailyReminderEmail({
            toEmail: u.email,
            userName: u.firstName || "",
            todayTasks: todayTasks.slice(0, 5),
            currentStreak: maxStreak,
          });
          emailSent++;
          console.log(`[Scheduler] Daily email sent to ${u.email}`);
        }

        if (u.pushNotificationsEnabled) {
          const taskSummary = todayTasks.length > 0
            ? todayTasks.slice(0, 2).map(t => t.taskTitle).join(", ")
            : "Check your habit plan for today";
          const streakMsg = maxStreak > 0 ? ` (${maxStreak}-day streak!)` : "";
          try {
            await sendPushToUser(u.id, {
              title: `Time for your habits${streakMsg}`,
              body: taskSummary,
              url: "/",
              tag: "daily-reminder",
            });
            pushSent++;
            console.log(`[Scheduler] Daily push sent to user ${u.id}`);
          } catch (pushErr) {
            console.error(`[Scheduler] Failed push for user ${u.id}:`, pushErr);
          }
        }

        await db.update(users).set({ lastDailyReminderSent: localTime.dateStr }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed daily reminder for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 500));
    }

    if (emailSent > 0 || pushSent > 0) {
      console.log(`[Scheduler] Daily reminders: ${emailSent} emails, ${pushSent} push`);
    }
  } catch (error) {
    console.error("[EmailScheduler] Error processing daily reminders:", error);
  }
}

function getWeekDates(todayStr: string): string[] {
  const today = new Date(todayStr + "T12:00:00Z");
  const dayOfWeek = today.getUTCDay();
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((dayOfWeek + 6) % 7));
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
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

        const isPaidUser = u.hasPaid && (u.subscriptionTier === "pro" || u.subscriptionTier === "premium");
        const isPremium = u.hasPaid && u.subscriptionTier === "premium";

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

        if (!isPaidUser) {
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
        } else {
          const weekDates = getWeekDates(localTime.dateStr);
          const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

          const dailyBreakdown = weekDates.map((dateStr, i) => {
            let scheduled = 0;
            let completed = 0;
            for (const h of userHabits) {
              const plans = (h.dailyPlans || []) as any[];
              const plan = plans.find((p: any) => p.date === dateStr);
              if (plan && plan.tasks && plan.tasks.length > 0) {
                scheduled++;
                const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
                if (activeTasks.length > 0 && (plan.completed || activeTasks.every((t: any) => t.completed))) {
                  completed++;
                }
              }
            }
            return { day: dayNames[i], date: dateStr, scheduled, completed, percent: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0 };
          });

          let totalTasks = 0;
          let completedTasks = 0;
          const habitPerformance = userHabits
            .filter(h => h.setupComplete && !h.archived)
            .map(h => {
              const plans = (h.dailyPlans || []) as any[];
              let habitCompleted = 0;
              let habitScheduled = 0;
              let habitTime = 0;
              for (const dateStr of weekDates) {
                const plan = plans.find((p: any) => p.date === dateStr);
                if (plan && plan.tasks && plan.tasks.length > 0) {
                  habitScheduled++;
                  const activeTasks = plan.tasks.filter((t: any) => !t.skipped);
                  const doneCount = activeTasks.filter((t: any) => t.completed).length;
                  totalTasks += activeTasks.length;
                  completedTasks += doneCount;
                  if (activeTasks.length > 0 && (plan.completed || activeTasks.every((t: any) => t.completed))) {
                    habitCompleted++;
                  }
                  if (plan.timeSpent) habitTime += plan.timeSpent;
                }
              }
              return {
                title: h.title,
                streak: h.currentStreak || 0,
                completionPercent: habitScheduled > 0 ? Math.round((habitCompleted / habitScheduled) * 100) : 0,
                daysCompleted: habitCompleted,
                daysScheduled: habitScheduled,
                timeMinutes: habitTime,
                category: h.category || "general",
              };
            })
            .sort((a, b) => b.completionPercent - a.completionPercent);

          const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          const bestDay = [...dailyBreakdown].sort((a, b) => b.percent - a.percent)[0];
          const worstDay = [...dailyBreakdown].filter(d => d.scheduled > 0).sort((a, b) => a.percent - b.percent)[0];

          const xpEarned = u.xpPoints || 0;
          const weeklyXpGoal = u.weeklyXpGoal || 500;

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          const recentAchievements = await db.query.userAchievements.findMany({
            where: and(
              eq(userAchievements.userId, u.id),
              gte(userAchievements.unlockedAt, oneWeekAgo)
            ),
          });

          let moodData: { avgEnergy: number; avgStress: number; avgSleep: number; avgMood: string; entries: number } | undefined;
          let missReasons: { reason: string; count: number }[] | undefined;
          let journalSummary: string | undefined;

          if (isPremium) {
            const weekMoods = await db.query.moodEntries.findMany({
              where: and(eq(moodEntries.userId, u.id)),
            });
            const thisWeekMoods = weekMoods.filter(m => weekDates.includes(m.date));

            if (thisWeekMoods.length > 0) {
              const energyVals = thisWeekMoods.filter(m => m.energy).map(m => m.energy!);
              const stressVals = thisWeekMoods.filter(m => m.stress).map(m => m.stress!);
              const sleepVals = thisWeekMoods.filter(m => m.sleep).map(m => m.sleep!);
              const moodMap: Record<string, number> = {};
              thisWeekMoods.forEach(m => { moodMap[m.mood] = (moodMap[m.mood] || 0) + 1; });
              const topMood = Object.entries(moodMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "okay";

              moodData = {
                avgEnergy: energyVals.length > 0 ? Math.round((energyVals.reduce((a, b) => a + b, 0) / energyVals.length) * 10) / 10 : 0,
                avgStress: stressVals.length > 0 ? Math.round((stressVals.reduce((a, b) => a + b, 0) / stressVals.length) * 10) / 10 : 0,
                avgSleep: sleepVals.length > 0 ? Math.round((sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length) * 10) / 10 : 0,
                avgMood: topMood,
                entries: thisWeekMoods.length,
              };
            }

            const allMissReasons: string[] = [];
            for (const h of userHabits) {
              const reasons = (h.missReasons || []) as any[];
              for (const r of reasons) {
                if (r.reason && weekDates.includes(r.date)) {
                  allMissReasons.push(r.reason);
                }
              }
            }
            if (allMissReasons.length > 0) {
              const reasonCounts: Record<string, number> = {};
              allMissReasons.forEach(r => { reasonCounts[r] = (reasonCounts[r] || 0) + 1; });
              missReasons = Object.entries(reasonCounts)
                .map(([reason, count]) => ({ reason, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);
            }

            const weekJournals = await db.query.journalEntries.findMany({
              where: eq(journalEntries.userId, u.id),
            });
            const thisWeekJournals = weekJournals.filter(j => weekDates.includes(j.date));
            if (thisWeekJournals.length > 0) {
              const insights = thisWeekJournals.filter(j => j.aiInsights).map(j => j.aiInsights!);
              if (insights.length > 0) {
                journalSummary = insights[insights.length - 1];
              } else {
                journalSummary = `${thisWeekJournals.length} journal ${thisWeekJournals.length === 1 ? "entry" : "entries"} this week`;
              }
            }
          }

          await sendPaidWeeklyDigestEmail({
            toEmail: u.email,
            userName: u.firstName || "",
            tier: isPremium ? "premium" : "pro",
            weekDateRange: `${weekDates[0]} to ${weekDates[6]}`,
            overallCompletion: completionRate,
            taskCompletionRate,
            dailyBreakdown,
            habitPerformance,
            streakInfo: {
              current: longestStreak,
              topHabit: topHabit || undefined,
              topHabitStreak,
            },
            xp: { earned: xpEarned, goal: weeklyXpGoal },
            achievements: recentAchievements.map(a => a.achievementId),
            totalMinutes,
            bestDay: bestDay ? { day: bestDay.day, percent: bestDay.percent } : undefined,
            worstDay: worstDay ? { day: worstDay.day, percent: worstDay.percent } : undefined,
            moodData,
            missReasons,
            journalSummary,
          });
        }

        await db.update(users).set({ lastWeeklyDigestSent: weekId }).where(eq(users.id, u.id));
        sent++;
        console.log(`[EmailScheduler] Weekly digest sent to ${u.email} (${isPaidUser ? u.subscriptionTier : 'free'})`);
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

async function processJournalReminders() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        eq(users.pushJournalReminder, true)
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);
      const reminderTime = u.journalReminderTime || "20:00";

      if (!isTimeMatch(localTime, reminderTime)) continue;
      if (u.lastJournalReminderSent === localTime.dateStr) continue;

      try {
        await sendPushToUser(u.id, {
          title: "Journal Time",
          body: "Time to reflect \u2014 open your journal",
          url: "/journal",
          tag: "journal-reminder",
        });
        pushSent++;
        console.log(`[Scheduler] Journal reminder push sent to user ${u.id}`);

        await db.update(users).set({ lastJournalReminderSent: localTime.dateStr }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed journal reminder for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Journal reminders: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing journal reminders:", error);
  }
}

async function processMoodCheckins() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        eq(users.pushMoodCheckin, true)
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);
      const checkinTimes = (u.moodCheckinTimes as string[]) || ["09:00", "14:00", "20:00"];

      const matchingTime = checkinTimes.find(t => isTimeMatch(localTime, t));
      if (!matchingTime) continue;

      const sentTracker = (u.lastMoodCheckinSent as Record<string, string>) || {};
      const dedupeKey = `${localTime.dateStr}_${matchingTime}`;
      if (sentTracker[dedupeKey]) continue;

      try {
        await sendPushToUser(u.id, {
          title: "Mood Check-in",
          body: "Quick check-in \u2014 how are you feeling?",
          url: "/mood",
          tag: `mood-checkin-${matchingTime}`,
        });
        pushSent++;
        console.log(`[Scheduler] Mood check-in push sent to user ${u.id} for ${matchingTime}`);

        const updatedTracker = { ...sentTracker, [dedupeKey]: localTime.dateStr };
        const oldKeys = Object.keys(updatedTracker).filter(k => !k.startsWith(localTime.dateStr));
        for (const k of oldKeys) delete updatedTracker[k];

        await db.update(users).set({ lastMoodCheckinSent: updatedTracker }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed mood check-in for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Mood check-ins: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing mood check-ins:", error);
  }
}

async function processStreakAlerts() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        eq(users.pushStreakAlerts, true)
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);
      const alertTime = u.streakAlertTime || "19:00";

      if (!isTimeMatch(localTime, alertTime)) continue;
      if (u.lastStreakAlertSent === localTime.dateStr) continue;

      try {
        const userHabits = await db.query.habits.findMany({
          where: eq(habits.userId, u.id),
        });

        const atRiskHabits = userHabits.filter(h => {
          if (!h.currentStreak || h.currentStreak <= 0) return false;
          if (h.archived) return false;
          const progress = h.progress as any[];
          if (!Array.isArray(progress)) return true;
          return !progress.some((p: any) => p.date === localTime.dateStr);
        });

        if (atRiskHabits.length > 0) {
          const topAtRisk = atRiskHabits.sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))[0];
          const body = atRiskHabits.length === 1
            ? `Your ${topAtRisk.currentStreak}-day streak for ${topAtRisk.title} is at risk!`
            : `${atRiskHabits.length} streaks at risk! Your ${topAtRisk.currentStreak}-day streak for ${topAtRisk.title} needs attention.`;

          await sendPushToUser(u.id, {
            title: "Streak Alert",
            body,
            url: "/",
            tag: "streak-alert",
          });
          pushSent++;
          console.log(`[Scheduler] Streak alert push sent to user ${u.id}`);
        }

        await db.update(users).set({ lastStreakAlertSent: localTime.dateStr }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed streak alert for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Streak alerts: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing streak alerts:", error);
  }
}

async function processHabitReminders() {
  try {
    const allReminders = await db.query.habitReminders.findMany({
      where: eq(habitReminders.enabled, true),
    });

    if (allReminders.length === 0) return;

    const userIdSet = new Set(allReminders.map(r => r.userId));
    const userIds = Array.from(userIdSet);
    const usersData = await db.query.users.findMany({
      where: or(...userIds.map(id => eq(users.id, id))),
    });
    const usersMap = new Map(usersData.map(u => [u.id, u]));

    const habitIdSet = new Set(allReminders.map(r => r.habitId));
    const habitIds = Array.from(habitIdSet);
    const habitsData = await db.query.habits.findMany({
      where: or(...habitIds.map(id => eq(habits.id, id))),
    });
    const habitsMap = new Map(habitsData.map(h => [h.id, h]));

    let pushSent = 0;
    for (const reminder of allReminders) {
      const user = usersMap.get(reminder.userId);
      if (!user) continue;
      if (!user.pushNotificationsEnabled || !user.pushHabitReminders) continue;

      const habit = habitsMap.get(reminder.habitId);
      if (!habit || habit.archived) continue;

      const localTime = getUserLocalTime(user.timezone);

      const reminderDays = (reminder.days as string[]) || [];
      if (reminderDays.length > 0 && !reminderDays.includes(localTime.dayName)) continue;

      if (!isTimeMatch(localTime, reminder.reminderTime)) continue;

      const sentTracker = (user.lastHabitRemindersSent as Record<string, string>) || {};
      const dedupeKey = `${reminder.habitId}_${localTime.dateStr}`;
      if (sentTracker[dedupeKey]) continue;

      try {
        await sendPushToUser(user.id, {
          title: "Habit Reminder",
          body: `Time for ${habit.title}!`,
          url: `/habits/${habit.id}`,
          tag: `habit-reminder-${habit.id}`,
        });
        pushSent++;
        console.log(`[Scheduler] Habit reminder push sent to user ${user.id} for habit ${habit.id}`);

        const updatedTracker = { ...sentTracker, [dedupeKey]: localTime.dateStr };
        const oldKeys = Object.keys(updatedTracker).filter(k => !k.endsWith(`_${localTime.dateStr}`));
        for (const k of oldKeys) delete updatedTracker[k];

        await db.update(users).set({ lastHabitRemindersSent: updatedTracker }).where(eq(users.id, user.id));
      } catch (err) {
        console.error(`[Scheduler] Failed habit reminder for user ${user.id}, habit ${habit.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Habit reminders: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing habit reminders:", error);
  }
}

async function processDailyPlanner() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        eq(users.pushDailyPlanner, true)
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);
      const plannerTime = u.dailyPlannerTime || "07:00";

      if (!isTimeMatch(localTime, plannerTime)) continue;
      if (u.lastDailyPlannerSent === localTime.dateStr) continue;

      try {
        const userTasks = await db.query.quickTasks.findMany({
          where: and(
            eq(quickTasks.userId, u.id),
            eq(quickTasks.date, localTime.dateStr),
            eq(quickTasks.completed, false)
          ),
        });

        const userHabits = await db.query.habits.findMany({
          where: eq(habits.userId, u.id),
        });

        let habitCount = 0;
        for (const habit of userHabits) {
          if (habit.archived) continue;
          const plans = habit.dailyPlans as any[];
          if (Array.isArray(plans)) {
            const todayPlan = plans.find((p: any) => p.date === localTime.dateStr);
            if (todayPlan && todayPlan.tasks) {
              const hasUncompletedTasks = (todayPlan.tasks as any[]).some((t: any) => !t.completed);
              if (hasUncompletedTasks) habitCount++;
            }
          }
        }

        const quickTaskCount = userTasks.length;
        const totalItems = habitCount + quickTaskCount;

        if (totalItems > 0) {
          let body: string;
          if (habitCount > 0 && quickTaskCount > 0) {
            body = `${habitCount} habit${habitCount !== 1 ? "s" : ""} and ${quickTaskCount} quick task${quickTaskCount !== 1 ? "s" : ""} on your plate today`;
          } else if (habitCount > 0) {
            body = `${habitCount} habit${habitCount !== 1 ? "s" : ""} planned for today`;
          } else {
            body = `${quickTaskCount} quick task${quickTaskCount !== 1 ? "s" : ""} planned for today`;
          }

          await sendPushToUser(u.id, {
            title: "Daily Planner",
            body,
            url: "/planner",
            tag: "daily-planner",
          });
          pushSent++;
          console.log(`[Scheduler] Daily planner push sent to user ${u.id}`);
        }

        await db.update(users).set({ lastDailyPlannerSent: localTime.dateStr }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed daily planner for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Daily planner: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing daily planner:", error);
  }
}

async function processGoalMilestones() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        eq(users.pushGoalMilestones, true)
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);

      if (u.lastGoalMilestoneSent === localTime.dateStr) continue;

      try {
        const userGoals = await db.query.goals.findMany({
          where: eq(goals.userId, u.id),
        });

        if (userGoals.length === 0) {
          await db.update(users).set({ lastGoalMilestoneSent: localTime.dateStr }).where(eq(users.id, u.id));
          continue;
        }

        const allMilestones = await db.query.goalMilestones.findMany({
          where: eq(goalMilestones.userId, u.id),
        });

        const newlyCompleted = allMilestones.filter(m => {
          if (!m.isCompleted || !m.completedAt) return false;
          const tz = u.timezone || "UTC";
          const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
          const completedDate = fmt.format(new Date(m.completedAt));
          return completedDate === localTime.dateStr;
        });

        if (newlyCompleted.length > 0) {
          const milestone = newlyCompleted[0];
          const body = newlyCompleted.length === 1
            ? `You hit a new milestone! ${milestone.title}`
            : `You hit ${newlyCompleted.length} new milestones! ${milestone.title} and more`;

          await sendPushToUser(u.id, {
            title: "Milestone Reached",
            body,
            url: "/goals",
            tag: "goal-milestone",
          });
          pushSent++;
          console.log(`[Scheduler] Goal milestone push sent to user ${u.id}`);
        }

        await db.update(users).set({ lastGoalMilestoneSent: localTime.dateStr }).where(eq(users.id, u.id));
      } catch (err) {
        console.error(`[Scheduler] Failed goal milestone for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Goal milestones: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing goal milestones:", error);
  }
}

async function processPlanAdjustmentAlerts() {
  try {
    const eligibleUsers = await db.query.users.findMany({
      where: and(
        eq(users.pushNotificationsEnabled, true),
        or(
          eq(users.subscriptionTier, "pro"),
          eq(users.subscriptionTier, "premium")
        )
      ),
    });

    let pushSent = 0;
    for (const u of eligibleUsers) {
      const localTime = getUserLocalTime(u.timezone);

      if (!isTimeMatch(localTime, "12:00")) continue;
      if (u.lastPlanAdjustNotified === localTime.dateStr) continue;

      try {
        const userHabits = await db.query.habits.findMany({
          where: eq(habits.userId, u.id),
        });

        const struggling = userHabits.filter(h => {
          if (!h.setupComplete || h.archived || h.downgradeArchived) return false;
          const dailyPlans = (h.dailyPlans || []) as any[];
          const pastDays = dailyPlans.filter((p: any) => p.date <= localTime.dateStr);
          if (pastDays.length < 5) return false;
          const hasFuture = dailyPlans.some((p: any) => p.date > localTime.dateStr);
          if (!hasFuture) return false;
          const active = pastDays.reduce((sum: number, p: any) => sum + (p.tasks || []).filter((t: any) => !t.skipped).length, 0);
          const completed = pastDays.reduce((sum: number, p: any) => sum + (p.tasks || []).filter((t: any) => t.completed).length, 0);
          const rate = active > 0 ? (completed / active) * 100 : 100;
          return rate < 40;
        });

        if (struggling.length > 0) {
          const topHabit = struggling[0];
          const body = struggling.length === 1
            ? `Your plan for "${topHabit.title}" might need adjusting — tap to review`
            : `${struggling.length} habit plans need attention. "${topHabit.title}" and others have low completion rates.`;

          await sendPushToUser(u.id, {
            title: "Plan Adjustment Available",
            body,
            url: `/habits/${topHabit.id}`,
            tag: "plan-adjust",
          });
          pushSent++;
          console.log(`[Scheduler] Plan adjustment push sent to user ${u.id}`);
          await db.update(users).set({ lastPlanAdjustNotified: localTime.dateStr }).where(eq(users.id, u.id));
        }
      } catch (err) {
        console.error(`[Scheduler] Failed plan adjustment alert for user ${u.id}:`, err);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    if (pushSent > 0) {
      console.log(`[Scheduler] Plan adjustment alerts: ${pushSent} push`);
    }
  } catch (error) {
    console.error("[Scheduler] Error processing plan adjustment alerts:", error);
  }
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function runAllSchedulerTasks() {
  processDailyReminders();
  processWeeklyDigests();
  processJournalReminders();
  processMoodCheckins();
  processStreakAlerts();
  processHabitReminders();
  processDailyPlanner();
  processGoalMilestones();
  processPlanAdjustmentAlerts();
}

export function startEmailScheduler() {
  if (schedulerInterval) return;

  console.log("[EmailScheduler] Starting scheduler (checks every 15 minutes) - all notification types enabled");

  setTimeout(() => {
    runAllSchedulerTasks();
  }, 10000);

  schedulerInterval = setInterval(() => {
    runAllSchedulerTasks();
  }, 15 * 60 * 1000);
}

export function stopEmailScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[EmailScheduler] Stopped");
  }
}
