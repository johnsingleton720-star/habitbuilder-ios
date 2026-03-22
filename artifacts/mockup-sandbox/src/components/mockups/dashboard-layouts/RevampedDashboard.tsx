import { useState } from "react";
import {
  Target, Flame, Zap, Star, Play, Check, ChevronDown, ChevronUp,
  BookOpen, Timer, Heart, Calendar, Layers, Plus, ArrowRight,
  CheckSquare, Crown, Sparkles, BarChart3, TrendingUp, Trophy,
  Bell, User, Settings, Quote, Smile, Frown, Meh, ThumbsUp, Lock
} from "lucide-react";

const habits = [
  { id: 1, name: "Morning Meditation", icon: "🧘", color: "#7c3aed", streak: 12, done: false, tasks: "0/3", time: "7:00 AM" },
  { id: 2, name: "Daily Running", icon: "🏃", color: "#ea580c", streak: 8, done: true, tasks: "2/2", time: "6:30 AM" },
  { id: 3, name: "Read 30 Minutes", icon: "📚", color: "#2563eb", streak: 21, done: false, tasks: "0/2", time: "9:00 PM" },
  { id: 4, name: "Drink Water", icon: "💧", color: "#0891b2", streak: 5, done: false, tasks: "Simple", time: null },
  { id: 5, name: "Cooking", icon: "🍳", color: "#d97706", streak: 3, done: false, tasks: "Simple", time: null },
];

const stacks = [
  { id: 1, name: "Morning Routine", color: "#7c3aed", habits: ["🧘 Meditation", "💧 Water", "🏃 Run"], time: "7:00 AM" },
];

const achievements = [
  { emoji: "🔥", label: "Week Warrior", earned: true },
  { emoji: "⚡", label: "Fast Starter", earned: true },
  { emoji: "🏆", label: "Month Master", earned: false },
  { emoji: "💎", label: "Diamond", earned: false },
  { emoji: "🌟", label: "Streak King", earned: true },
];

const quickTasks = [
  { id: 1, label: "Buy groceries", done: true },
  { id: 2, label: "Reply to emails", done: false },
  { id: 3, label: "Schedule dentist", done: false },
];

const dailyChallenges = [
  { label: "Complete 3 habits", progress: 1, total: 3, xp: 50 },
  { label: "Log a mood entry", progress: 0, total: 1, xp: 20 },
];

const weekDays = [
  { day: "M", completed: true, partial: false },
  { day: "T", completed: true, partial: false },
  { day: "W", completed: false, partial: true },
  { day: "T", completed: true, partial: false },
  { day: "F", completed: false, partial: true },
  { day: "S", completed: false, partial: false },
  { day: "S", completed: false, partial: false },
];

export function RevampedDashboard() {
  const [habitsOpen, setHabitsOpen] = useState(true);
  const [tasks, setTasks] = useState(quickTasks);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = habits.filter(h => h.done).length;
  const progressPct = Math.round((completedCount / habits.length) * 100);

  return (
    <div className="min-h-screen bg-[#f5f6f8] font-sans text-gray-900 overflow-y-auto">
      {/* ═══ STICKY HEADER with streak ═══ */}
      <div className="bg-white px-4 pt-3 pb-3 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">J</div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Good morning,</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">John</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-full px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-[13px] font-bold text-orange-600">21d</span>
            </div>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="pb-24 space-y-0">
        {/* ═══ HERO CARD with integrated stats ═══ */}
        <div className="bg-white px-4 pb-4 shadow-sm">
          <div className="bg-gradient-to-r from-violet-50 to-emerald-50 rounded-2xl border border-violet-100/80 p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg width="60" height="60" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle cx="34" cy="34" r="28" fill="none" stroke="#7c3aed" strokeWidth="5"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.68)}`}
                    strokeLinecap="round" transform="rotate(-90 34 34)" />
                  <text x="34" y="34" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, fontWeight: 700, fill: "#7c3aed" }}>12</text>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[15px] font-bold text-gray-900">Level 12</span>
                  <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">Habit Builder</span>
                </div>
                <p className="text-[12px] text-gray-500 mb-1">2,340 XP · 660 to next</p>
                <span className="flex items-center gap-1 text-violet-500 font-semibold text-[12px]"><Zap className="w-3.5 h-3.5" />2× streak multiplier</span>
              </div>
            </div>
            {/* Compact stat row */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-violet-100/60">
              <div className="text-center">
                <p className="text-[16px] font-bold text-violet-600">{progressPct}%</p>
                <p className="text-[10px] text-gray-400 font-medium">Today</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-emerald-600">72%</p>
                <p className="text-[10px] text-gray-400 font-medium">This Week</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-amber-600">113</p>
                <p className="text-[10px] text-gray-400 font-medium">Total Done</p>
              </div>
              <div className="text-center">
                <p className="text-[16px] font-bold text-orange-500">21</p>
                <p className="text-[10px] text-gray-400 font-medium">Best Streak</p>
              </div>
            </div>
          </div>
          {/* 7-day completion strip */}
          <div className="flex items-center justify-between mt-3 px-1">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-400 font-medium">{d.day}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  d.completed
                    ? 'bg-gradient-to-br from-violet-500 to-emerald-400 text-white shadow-sm'
                    : d.partial
                    ? 'bg-violet-100 text-violet-600 border-2 border-violet-200'
                    : 'bg-gray-100 text-gray-300'
                }`}>
                  {d.completed ? <Check className="w-3.5 h-3.5" /> : d.partial ? '½' : '·'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Quote */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Quote className="w-3.5 h-3.5 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-gray-700 italic leading-relaxed">"Small daily improvements are the key to staggering long-term results."</p>
              <p className="text-[11px] text-gray-400 mt-0.5">— Robin Sharma</p>
            </div>
          </div>
        </div>

        {/* ═══ TODAY'S FOCUS ═══ */}
        <div className="mt-4 px-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Today</p>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
            <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900">Daily Focus</p>
                  <p className="text-[11px] text-gray-400">Saturday, March 22</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-violet-600">{progressPct}%</p>
                <p className="text-[11px] text-gray-400">{completedCount}/{habits.length} done</p>
              </div>
            </div>
            <div className="px-4 py-2.5 border-b border-gray-50">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="p-3.5">
              <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1 mb-2"><Zap className="w-3.5 h-3.5" />Up next</p>
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3.5 flex items-center gap-3">
                <span className="text-2xl">🧘</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-gray-900 truncate">Morning Meditation</p>
                  <p className="text-[11px] text-gray-400">7:00 AM · 0/3 tasks</p>
                </div>
                <button className="flex items-center gap-1.5 bg-gray-900 text-white text-[12px] font-bold px-3.5 py-2 rounded-xl shadow-sm">
                  <Play className="w-3 h-3" fill="white" />Start
                </button>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-2.5 flex items-center gap-2">
                  <span className="text-base">📚</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">Read 30 Min</p>
                    <p className="text-[10px] text-gray-400">9:00 PM</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-2.5 flex items-center gap-2">
                  <span className="text-base">💧</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">Drink Water</p>
                    <p className="text-[10px] text-gray-400">Simple</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tasks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900 flex items-center gap-2"><CheckSquare className="w-4 h-4 text-gray-400" />Quick Tasks</p>
              <button className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2.5">
              {tasks.map(t => (
                <button key={t.id} className="flex items-center gap-3 w-full text-left" onClick={() => toggleTask(t.id)}>
                  <div className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} style={{ width: 20, height: 20 }}>
                    {t.done && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-[13px] ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ YOUR HABITS — wrapped in a defined card zone ═══ */}
        <div className="px-4 mt-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Section header bar */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 flex items-center justify-between border-b border-violet-100/60">
              <button className="flex items-center gap-2" onClick={() => setHabitsOpen(v => !v)}>
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-violet-600" />
                </div>
                <p className="text-[14px] font-bold text-gray-900">Your Habits</p>
                <span className="bg-violet-600 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">{habits.length}</span>
                {habitsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              <div className="flex gap-2">
                <button className="text-[11px] text-violet-600 font-semibold bg-white border border-violet-200 rounded-lg px-2.5 py-1.5">Templates</button>
                <button className="flex items-center gap-1 bg-violet-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm shadow-violet-200">
                  <Plus className="w-3 h-3" />New
                </button>
              </div>
            </div>

            {habitsOpen && (
              <>
                {/* Habit rows */}
                {habits.map((h, i) => (
                  <div key={h.id} className={`flex items-center gap-3.5 px-4 py-3 ${i < habits.length - 1 ? 'border-b border-gray-50' : ''} ${h.done ? 'opacity-50' : ''}`}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: h.color + '18' }}>
                      {h.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold truncate ${h.done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{h.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-orange-500 font-semibold"><Flame className="w-3 h-3" />{h.streak}d</span>
                        <span className="text-[11px] text-gray-400">{h.tasks}</span>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${h.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                      {h.done && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                ))}

                {/* Habit Stacks inside the card */}
                <div className="border-t border-gray-100 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[12px] font-bold text-gray-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Habit Stacks</p>
                    <button className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus className="w-3 h-3 text-gray-500" />
                    </button>
                  </div>
                  {stacks.map(s => (
                    <div key={s.id} className="bg-gray-50 rounded-xl border border-gray-100 p-3" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[12px] font-bold text-gray-900">{s.name}</p>
                        <span className="text-[10px] text-gray-400">{s.time}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.habits.map((h, i) => (
                          <span key={i} className="text-[10px] bg-white border border-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{h}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ═══ ACHIEVEMENTS & CHALLENGES — compact section ═══ */}
        <div className="px-4 mt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Achievements & Rewards</p>

          {/* Badges — horizontal scrollable row */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />Badges</p>
              <button className="text-[11px] text-violet-600 font-semibold" onClick={() => setAchievementsExpanded(!achievementsExpanded)}>
                {achievementsExpanded ? 'Less' : '3/5 earned'}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {(achievementsExpanded ? achievements : achievements.slice(0, 4)).map((a, i) => (
                <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-shrink-0 ${a.earned ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`} style={{ minWidth: 60 }}>
                  <span className={`text-xl ${!a.earned ? 'grayscale opacity-40' : ''}`}>{a.emoji}</span>
                  <span className="text-[9px] text-center font-semibold text-gray-500 leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Challenges — compact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><Zap className="w-4 h-4 text-violet-500" />Daily Challenges</p>
              <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">0/2 Complete</span>
            </div>
            <div className="space-y-2.5">
              {dailyChallenges.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-gray-700">{c.label}</span>
                      <span className="text-[10px] font-semibold text-violet-600">+{c.xp} XP</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(c.progress / c.total) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-600">Weekly XP</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                </div>
                <span className="text-[10px] text-gray-400">450/1k</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TOOLS — uniform grid ═══ */}
        <div className="px-4 mt-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Tools</p>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Mood — compact card matching grid */}
            <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-3.5 flex items-center gap-3 col-span-1">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Smile className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Mood</p>
                <p className="text-[10px] text-teal-600 font-medium">Log now</p>
              </div>
            </div>

            {/* Journal — compact */}
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-3.5 flex items-center gap-3 col-span-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Journal</p>
                <p className="text-[10px] text-indigo-600 font-medium">Write today</p>
              </div>
            </div>

            {/* Focus Timer */}
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Focus</p>
                <p className="text-[10px] text-gray-400">Deep work</p>
              </div>
            </div>

            {/* Goals */}
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Goals</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Premium</p>
              </div>
            </div>

            {/* Daily Planner */}
            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Planner</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Premium</p>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Analytics</p>
                <p className="text-[10px] text-gray-400">View insights</p>
              </div>
            </div>
          </div>
        </div>

        <div className="h-4" />
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2.5 flex items-center justify-around">
        {[
          { icon: Target, label: "Dashboard", active: true },
          { icon: Layers, label: "Habits", active: false },
          { icon: BarChart3, label: "Progress", active: false },
          { icon: User, label: "Account", active: false },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-0.5">
            <item.icon className={`w-5 h-5 ${item.active ? 'text-violet-600' : 'text-gray-400'}`} />
            <span className={`text-[11px] font-medium ${item.active ? 'text-violet-600' : 'text-gray-400'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
