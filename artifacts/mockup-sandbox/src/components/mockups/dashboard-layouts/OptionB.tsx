import { useState } from "react";
import {
  Target, Flame, Zap, Star, Play, Check, ChevronDown,
  BookOpen, Timer, Heart, Calendar, Layers, Plus, ArrowRight,
  CheckSquare, Crown, Sparkles, BarChart3, TrendingUp, Trophy,
  User, Settings, Bell, Lock
} from "lucide-react";

const habits = [
  { id: 1, name: "Morning Meditation", icon: "🧘", color: "#7c3aed", streak: 12, done: false, tasks: "0/3", time: "7:00 AM" },
  { id: 2, name: "Daily Running", icon: "🏃", color: "#ea580c", streak: 8, done: true, tasks: "1/2", time: "6:30 AM" },
  { id: 3, name: "Read 30 Minutes", icon: "📚", color: "#2563eb", streak: 21, done: false, tasks: "0/2", time: "9:00 PM" },
  { id: 4, name: "Drink Water", icon: "💧", color: "#0891b2", streak: 5, done: false, tasks: "Simple", time: null },
  { id: 5, name: "Spanish Practice", icon: "🗣️", color: "#16a34a", streak: 3, done: false, tasks: "0/1", time: "8:00 PM" },
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

const stacks = [
  { id: 1, name: "Morning Routine", color: "#7c3aed", habits: ["🧘 Meditation", "💧 Water", "🏃 Run"], time: "7:00 AM" },
  { id: 2, name: "Evening Wind-down", color: "#2563eb", habits: ["📚 Reading", "🗣️ Spanish"], time: "9:00 PM" },
];

function TodayTab() {
  const [tasks, setTasks] = useState(quickTasks);
  const completedCount = habits.filter(h => h.done).length;
  const progressPct = Math.round((completedCount / habits.length) * 100);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="space-y-3">
      {/* Trial banner */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-3.5 flex items-center gap-3 shadow-md shadow-violet-200">
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Crown className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-[12px] font-bold">5 days left in trial</p>
          <p className="text-white/70 text-[10px]">Upgrade to keep Premium features</p>
        </div>
        <button className="bg-white text-violet-700 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0">Upgrade</button>
      </div>

      {/* Focus card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-3.5 pb-3 border-b border-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Today's Focus</p>
            <p className="text-[10px] text-gray-400">Saturday, March 21</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-violet-600">{progressPct}%</p>
            <p className="text-[10px] text-gray-400">{completedCount}/{habits.length} done</p>
          </div>
        </div>
        <div className="px-4 py-2 border-b border-gray-50">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <div className="p-3 space-y-2">
          <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><Zap className="w-3 h-3" />Up next</p>
          <div className="bg-violet-50 rounded-xl border border-violet-100 p-3 flex items-center gap-3">
            <span className="text-xl">🧘</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900 truncate">Morning Meditation</p>
              <p className="text-[10px] text-gray-400">7:00 AM · 0/3 tasks</p>
            </div>
            <button className="flex items-center gap-1 bg-gray-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
              <Play className="w-3 h-3" fill="white" />Start
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {habits.slice(2, 4).map(h => (
              <div key={h.id} className="bg-gray-50 rounded-xl border border-gray-100 p-2.5 flex items-center gap-2">
                <span className="text-base">{h.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-800 truncate">{h.name}</p>
                  {h.time && <p className="text-[9px] text-gray-400">{h.time}</p>}
                </div>
              </div>
            ))}
          </div>
          <button className="w-full text-[11px] text-gray-400 flex items-center justify-center gap-1 py-1">
            <ChevronDown className="w-3.5 h-3.5" />1 more habit
          </button>
        </div>
      </div>

      {/* Quick Tasks */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-gray-400" />Quick Tasks</p>
          <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-2">
          {tasks.map(t => (
            <button key={t.id} className="flex items-center gap-2.5 w-full text-left" onClick={() => toggleTask(t.id)}>
              <div className={`rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} style={{ width: 18, height: 18 }}>
                {t.done && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className={`text-[12px] ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tools quick row */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
        <p className="text-[11px] font-bold text-gray-500 mb-2.5">Tools</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Timer, label: "Focus", color: "text-amber-500", bg: "bg-amber-50" },
            { icon: Heart, label: "Mood", color: "text-teal-500", bg: "bg-teal-50" },
            { icon: BookOpen, label: "Journal", color: "text-indigo-500", bg: "bg-indigo-50" },
          ].map((t, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-gray-50">
              <div className={`w-9 h-9 rounded-xl ${t.bg} flex items-center justify-center`}>
                <t.icon className={`w-4.5 h-4.5 ${t.color}`} style={{ width: 18, height: 18 }} />
              </div>
              <span className="text-[10px] font-semibold text-gray-600">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HabitsTab() {
  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-gray-700">5 active habits</p>
        <button className="flex items-center gap-1 bg-violet-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm shadow-violet-200">
          <Plus className="w-3 h-3" />New Habit
        </button>
      </div>

      {/* Habit list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {habits.map((h, i) => (
          <div key={h.id} className={`flex items-center gap-3 px-3.5 py-3.5 ${i < habits.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: h.color + '22' }}>
              {h.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{h.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-0.5 text-[10px] text-orange-500 font-semibold"><Flame className="w-2.5 h-2.5" />{h.streak}d</span>
                <span className="text-[10px] text-gray-400">{h.tasks}</span>
                {h.time && <span className="text-[10px] text-gray-400">{h.time}</span>}
              </div>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${h.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200'}`}>
              {h.done && <Check className="w-3.5 h-3.5 text-white" />}
            </div>
          </div>
        ))}
      </div>

      {/* Habit Stacks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />Habit Stacks</p>
          <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
        <div className="space-y-2">
          {stacks.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-bold text-gray-900">{s.name}</p>
                <span className="text-[10px] text-gray-400">{s.time}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {s.habits.map((h, i) => (
                  <span key={i} className="text-[10px] bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{h}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProgressTab() {
  return (
    <div className="space-y-3">
      {/* Hero XP card */}
      <div className="bg-gradient-to-r from-violet-50 to-emerald-50 rounded-2xl border border-violet-100 p-4 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="5" />
            <circle cx="32" cy="32" r="26" fill="none" stroke="#7c3aed" strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - 0.68)}`}
              strokeLinecap="round" transform="rotate(-90 32 32)" />
            <text x="32" y="32" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 13, fontWeight: 700, fill: "#7c3aed" }}>12</text>
          </svg>
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
            <Star className="w-2.5 h-2.5 text-white" fill="white" />
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">Level 12 · Habit Builder</p>
          <p className="text-[11px] text-gray-500 mb-2">2,340 XP · 660 to Level 13</p>
          <div className="flex gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-orange-500 font-semibold"><Flame className="w-3 h-3" />21-day streak</span>
            <span className="flex items-center gap-1 text-violet-500 font-semibold"><Zap className="w-3 h-3" />1.5× bonus</span>
          </div>
        </div>
      </div>

      {/* Weekly chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900">This Week</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+18% vs last week</span>
        </div>
        <div className="flex items-end gap-1.5 h-16">
          {[65, 80, 45, 90, 70, 100, 25].map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-sm" style={{ height: `${v * 0.58}px`, background: i === 6 ? '#e5e7eb' : 'linear-gradient(to top, #7c3aed, #a78bfa)' }} />
              <span className="text-[8px] text-gray-400">{['M','T','W','T','F','S','S'][i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />Achievements</p>
          <button className="text-[11px] text-violet-600 font-semibold">See all</button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {achievements.map((a, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 p-2 rounded-xl ${a.earned ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
              <span className={`text-xl ${!a.earned ? 'grayscale opacity-40' : ''}`}>{a.emoji}</span>
              <span className="text-[9px] text-center font-semibold text-gray-500 leading-tight">{a.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Habit breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-sm font-bold text-gray-900 mb-3">Habit Performance</p>
        <div className="space-y-2.5">
          {habits.slice(0, 3).map(h => (
            <div key={h.id} className="flex items-center gap-3">
              <span className="text-base w-6 text-center">{h.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-gray-700 truncate">{h.name}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{Math.floor(Math.random() * 30 + 60)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.floor(Math.random() * 30 + 60)}%`, backgroundColor: h.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OptionB() {
  const [tab, setTab] = useState<"today" | "habits" | "progress">("today");

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans text-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 pt-3 pb-0 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">J</div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Good morning,</p>
              <p className="text-base font-bold text-gray-900 leading-tight">John</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-gray-500" />
            </button>
            <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Hero stats strip */}
        <div className="flex items-center gap-3 py-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center">
              <Star className="w-3.5 h-3.5 text-violet-600" fill="#7c3aed" />
            </div>
            <div>
              <p className="text-[9px] text-gray-400 leading-none">Level</p>
              <p className="text-[12px] font-bold text-gray-900 leading-none">12</p>
            </div>
          </div>
          <div className="w-px h-6 bg-gray-100" />
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-[9px] text-gray-400 leading-none">Streak</p>
              <p className="text-[12px] font-bold text-gray-900 leading-none">21 days</p>
            </div>
          </div>
          <div className="w-px h-6 bg-gray-100" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-violet-500" />
            <div>
              <p className="text-[9px] text-gray-400 leading-none">XP</p>
              <p className="text-[12px] font-bold text-gray-900 leading-none">2,340</p>
            </div>
          </div>
          <div className="flex-1" />
          {/* XP progress */}
          <div className="flex items-center gap-1.5">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: '68%' }} />
            </div>
            <span className="text-[9px] text-gray-400">68%</span>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex border-t border-gray-100">
          {([
            { id: "today", label: "Today" },
            { id: "habits", label: "My Habits" },
            { id: "progress", label: "Progress" },
          ] as const).map(t => (
            <button
              key={t.id}
              className={`flex-1 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${tab === t.id ? 'text-violet-600 border-violet-600' : 'text-gray-400 border-transparent'}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {tab === "today" && <TodayTab />}
        {tab === "habits" && <HabitsTab />}
        {tab === "progress" && <ProgressTab />}
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
            <span className={`text-[10px] font-medium ${item.active ? 'text-violet-600' : 'text-gray-400'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
