import type { Achievement } from "@shared/schema";

export const ACHIEVEMENTS: Achievement[] = [
  // Streak achievements
  {
    id: "streak_3",
    name: "Getting Started",
    description: "Complete a 3-day streak",
    icon: "Flame",
    category: "streak",
    requirement: 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Complete a 7-day streak",
    icon: "Flame",
    category: "streak",
    requirement: 7,
  },
  {
    id: "streak_14",
    name: "Habit Hero",
    description: "Complete a 14-day streak",
    icon: "Flame",
    category: "streak",
    requirement: 14,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Complete a 30-day streak",
    icon: "Flame",
    category: "streak",
    requirement: 30,
  },
  {
    id: "streak_100",
    name: "Century Champion",
    description: "Complete a 100-day streak",
    icon: "Crown",
    category: "streak",
    requirement: 100,
  },
  
  // Completion achievements
  {
    id: "sessions_5",
    name: "First Steps",
    description: "Complete 5 guided sessions",
    icon: "Target",
    category: "completion",
    requirement: 5,
  },
  {
    id: "sessions_25",
    name: "Committed",
    description: "Complete 25 guided sessions",
    icon: "Target",
    category: "completion",
    requirement: 25,
  },
  {
    id: "sessions_100",
    name: "Dedicated",
    description: "Complete 100 guided sessions",
    icon: "Trophy",
    category: "completion",
    requirement: 100,
  },
  
  // Time achievements
  {
    id: "time_60",
    name: "Hour Invested",
    description: "Spend 1 hour on habits",
    icon: "Clock",
    category: "time",
    requirement: 60, // minutes
  },
  {
    id: "time_300",
    name: "Five Hours Strong",
    description: "Spend 5 hours on habits",
    icon: "Clock",
    category: "time",
    requirement: 300,
  },
  {
    id: "time_1200",
    name: "Time Master",
    description: "Spend 20 hours on habits",
    icon: "Clock",
    category: "time",
    requirement: 1200,
  },
  
  // Milestone achievements
  {
    id: "habits_3",
    name: "Triple Threat",
    description: "Create 3 habits",
    icon: "Sparkles",
    category: "milestone",
    requirement: 3,
  },
  {
    id: "habits_5",
    name: "Habit Collector",
    description: "Create 5 habits",
    icon: "Sparkles",
    category: "milestone",
    requirement: 5,
  },
  {
    id: "first_plan",
    name: "Planner",
    description: "Generate your first action plan",
    icon: "ClipboardCheck",
    category: "milestone",
    requirement: 1,
  },
];

export function getAchievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function getAchievementsByCategory(category: Achievement["category"]): Achievement[] {
  return ACHIEVEMENTS.filter(a => a.category === category);
}
