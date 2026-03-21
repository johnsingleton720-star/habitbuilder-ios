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
];

const stacks = [
  { id: 1, name: "Morning Routine", color: "#7c3aed", habits: ["🧘 Meditation", "💧 Water", "🏃 Run"], time: "7:00 AM" },
  { id: 2, name: "Evening Wind-down", color: "#2563eb", habits: ["📚 Reading"], time: "9:00 PM" },
];

const achievements = [
  { emoji: "🔥", label: "Week Warrior", earned: true },
  { emoji: "⚡", label: "Fast Starter", earned: true },
  { emoji: "🏆", label: "Month Master", earned: false },
  { emoji: "💎", label: "Diamond", earned: false },
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

export function FinalDesign() {
  const [habitsOpen, setHabitsOpen] = useState(true);
  const [tasks, setTasks] = useState(quickTasks);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = habits.filter(h => h.done).length;
  const progressPct = Math.round((completedCount / habits.length) * 100);

  const moods = [
    { icon: Frown, label: "Bad", color: "text-red-400", bg: "bg-red-50", border: "border-red-200" },
    { icon: Meh, label: "Meh", color: "text-amber-400", bg: "bg-amber-50", border: "border-amber-200" },
    { icon: Smile, label: "Good", color: "text-emerald-400", bg: "bg-emerald-50", border: "border-emerald-200" },
    { icon: ThumbsUp, label: "Great", color: "text-violet-400", bg: "bg-violet-50", border: "border-violet-200" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6f8] font-sans text-gray-900 overflow-y-auto">
      {/* Sticky Header */}
      <div className="bg-white px-4 pt-3 pb-0 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">J</div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Good morning,</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">John</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="pb-24 space-y-0">
        {/* Hero Card */}
        <div className="bg-white px-4 pb-4 shadow-sm">
          <div className="bg-gradient-to-r from-violet-50 to-emerald-50 rounded-2xl border border-violet-100/80 p-4 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <svg width="68" height="68" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="28" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="34" cy="34" r="28" fill="none" stroke="#7c3aed" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - 0.68)}`}
                  strokeLinecap="round" transform="rotate(-90 34 34)" />
                <text x="34" y="34" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, fontWeight: 700, fill: "#7c3aed" }}>12</text>
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" fill="white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[15px] font-bold text-gray-900">Level 12</span>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">Habit Builder</span>
              </div>
              <p className="text-[12px] text-gray-500 mb-1.5">2,340 XP · 660 to next level</p>
              <div className="flex gap-3 text-[12px]">
                <span className="flex items-center gap-1 text-orange-500 font-semibold"><Flame className="w-3.5 h-3.5" />21 days</span>
                <span className="flex items-center gap-1 text-violet-500 font-semibold"><Zap className="w-3.5 h-3.5" />1.5× streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Quote */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <Quote className="w-4 h-4 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-gray-700 italic leading-relaxed">"Small daily improvements are the key to staggering long-term results."</p>
              <p className="text-[11px] text-gray-400 mt-1">— Robin Sharma</p>
            </div>
          </div>
        </div>

        {/* ═══ TODAY ═══ */}
        <div className="mt-5 px-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Today</p>

          {/* Today's Focus */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
            <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-gray-900">Daily Focus</p>
                  <p className="text-[11px] text-gray-400">Saturday, March 21</p>
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
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
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

        {/* ═══ YOUR HABITS ═══ */}
        <div className="px-4 mt-2">
          <div className="flex items-center justify-between mb-3">
            <button className="flex items-center gap-2" onClick={() => setHabitsOpen(v => !v)}>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em]">Your Habits</p>
              <span className="bg-violet-100 text-violet-700 text-[11px] px-2 py-0.5 rounded-full font-bold">{habits.length}</span>
              {habitsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            <button className="flex items-center gap-1.5 bg-violet-600 text-white text-[12px] font-bold px-3 py-2 rounded-xl shadow-sm shadow-violet-200">
              <Plus className="w-3.5 h-3.5" />New Habit
            </button>
          </div>
          {habitsOpen && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
                {habits.map((h, i) => (
                  <div key={h.id} className={`flex items-center gap-3.5 px-4 py-3.5 ${i < habits.length - 1 ? 'border-b border-gray-50' : ''}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: h.color + '18' }}>
                      {h.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-gray-900 truncate">{h.name}</p>
                      <div className="flex items-center gap-2.5 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-orange-500 font-semibold"><Flame className="w-3 h-3" />{h.streak}d</span>
                        <span className="text-[11px] text-gray-400">{h.tasks}</span>
                        {h.time && <span className="text-[11px] text-gray-400">{h.time}</span>}
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${h.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
                      {h.done && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Habit Stacks inside habits section */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-bold text-gray-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Habit Stacks</p>
                  <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                </div>
                <div className="space-y-2">
                  {stacks.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[13px] font-bold text-gray-900">{s.name}</p>
                        <span className="text-[11px] text-gray-400">{s.time}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.habits.map((h, i) => (
                          <span key={i} className="text-[11px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{h}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ═══ PROGRESS ═══ */}
        <div className="px-4 mt-2">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Progress</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-bold text-gray-900">This Week</p>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5" />+18% vs last week</span>
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {[65, 80, 45, 90, 70, 100, 25].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: `${v * 0.6}px`, background: i === 6 ? '#e5e7eb' : 'linear-gradient(to top, #7c3aed, #a78bfa)' }} />
                  <span className="text-[9px] text-gray-400 font-medium">{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ ACHIEVEMENTS & GAMIFICATION ═══ */}
        <div className="px-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Achievements</p>

          {/* Badges */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-bold text-gray-900 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />Badges & Rewards</p>
              <button className="text-[12px] text-violet-600 font-semibold">See all</button>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {achievements.map((a, i) => (
                <div key={i} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl ${a.earned ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                  <span className={`text-2xl ${!a.earned ? 'grayscale opacity-40' : ''}`}>{a.emoji}</span>
                  <span className="text-[10px] text-center font-semibold text-gray-500 leading-tight">{a.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Challenges / Gamification */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[14px] font-bold text-gray-900 flex items-center gap-1.5"><Zap className="w-4 h-4 text-violet-500" />Daily Challenges</p>
              <span className="text-[11px] text-gray-400">Resets at midnight</span>
            </div>
            <div className="space-y-3">
              {dailyChallenges.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-gray-700">{c.label}</span>
                    <span className="text-[11px] font-semibold text-violet-600">+{c.xp} XP</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(c.progress / c.total) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{c.progress}/{c.total}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-gray-700">Weekly XP Goal</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '45%' }} />
                </div>
                <span className="text-[11px] text-gray-400">450/1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ TOOLS ═══ */}
        <div className="px-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.12em] mb-3">Tools</p>

          {/* Mood Tracker Widget */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <p className="text-[14px] font-bold text-gray-900 mb-3">How are you feeling?</p>
            <div className="grid grid-cols-4 gap-2.5">
              {moods.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMood(i)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${selectedMood === i ? `${m.bg} ${m.border} scale-105` : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <m.icon className={`w-6 h-6 ${selectedMood === i ? m.color : 'text-gray-400'}`} />
                  <span className={`text-[11px] font-semibold ${selectedMood === i ? 'text-gray-700' : 'text-gray-400'}`}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Journal Card */}
          <div className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 shadow-sm p-4 mb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">Daily Journal</p>
              <p className="text-[12px] text-gray-500">Write reflections & get AI insights</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </div>

          {/* Explore Grid — 4 tools matching real app */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Timer className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Focus Timer</p>
                <p className="text-[10px] text-gray-400">Deep work sessions</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Mood Insights</p>
                <p className="text-[10px] text-gray-400">Track your trends</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Goals</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Premium</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-800">Daily Planner</p>
                <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Premium</p>
              </div>
            </div>
          </div>
        </div>
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
