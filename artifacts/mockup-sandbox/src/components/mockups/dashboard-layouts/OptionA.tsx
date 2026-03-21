import { useState } from "react";
import {
  Target, Flame, Zap, Star, Play, Check, ChevronDown, ChevronUp,
  BookOpen, Timer, Heart, Calendar, Layers, Plus, ArrowRight,
  CheckSquare, Crown, Sparkles, BarChart3, TrendingUp, Trophy,
  Moon, Sun, Bell, User, Settings
} from "lucide-react";

const habits = [
  { id: 1, name: "Morning Meditation", icon: "🧘", color: "#7c3aed", streak: 12, done: false, tasks: "0/3", time: "7:00 AM", category: "mindfulness" },
  { id: 2, name: "Daily Running", icon: "🏃", color: "#ea580c", streak: 8, done: true, tasks: "1/2", time: "6:30 AM", category: "fitness" },
  { id: 3, name: "Read 30 Minutes", icon: "📚", color: "#2563eb", streak: 21, done: false, tasks: "0/2", time: "9:00 PM", category: "learning" },
  { id: 4, name: "Drink Water", icon: "💧", color: "#0891b2", streak: 5, done: false, tasks: "Simple", time: null, category: "health" },
];

const achievements = [
  { emoji: "🔥", label: "Week Warrior", earned: true },
  { emoji: "⚡", label: "Fast Starter", earned: true },
  { emoji: "🏆", label: "Month Master", earned: false },
  { emoji: "💎", label: "Diamond", earned: false },
];

const tools = [
  { icon: Timer, label: "Focus Timer", color: "text-amber-500", bg: "bg-amber-50", locked: false },
  { icon: Heart, label: "Mood Check-in", color: "text-teal-500", bg: "bg-teal-50", locked: false },
  { icon: BookOpen, label: "Journal", color: "text-indigo-500", bg: "bg-indigo-50", locked: false },
  { icon: Target, label: "Goals", color: "text-rose-500", bg: "bg-rose-50", locked: true, badge: "Premium" },
  { icon: Calendar, label: "Planner", color: "text-sky-500", bg: "bg-sky-50", locked: true, badge: "Premium" },
  { icon: Layers, label: "Habit Stacks", color: "text-purple-500", bg: "bg-purple-50", locked: true, badge: "Pro+" },
];

const quickTasks = [
  { id: 1, label: "Buy groceries", done: true },
  { id: 2, label: "Reply to emails", done: false },
  { id: 3, label: "Schedule dentist", done: false },
];

export function OptionA() {
  const [habitsOpen, setHabitsOpen] = useState(true);
  const [tasks, setTasks] = useState(quickTasks);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const completedCount = habits.filter(h => h.done).length;
  const progressPct = Math.round((completedCount / habits.length) * 100);

  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans text-gray-900 overflow-y-auto">
      {/* Status bar area */}
      <div className="bg-white px-4 pt-3 pb-0 sticky top-0 z-50 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between pb-3">
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
      </div>

      <div className="pb-24 space-y-0">
        {/* Hero Card */}
        <div className="bg-white px-4 pb-4 shadow-sm">
          <div className="bg-gradient-to-r from-violet-50 to-emerald-50 rounded-2xl border border-violet-100 p-3.5 flex items-center gap-4">
            {/* XP Ring */}
            <div className="relative flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none" stroke="#7c3aed" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - 0.68)}`}
                  strokeLinecap="round" transform="rotate(-90 32 32)" />
                <text x="32" y="32" textAnchor="middle" dominantBaseline="central" className="text-xs" style={{ fontSize: 13, fontWeight: 700, fill: "#7c3aed" }}>12</text>
              </svg>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center">
                <Star className="w-2.5 h-2.5 text-white" fill="white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm font-bold text-gray-900">Level 12</span>
                <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">Habit Builder</span>
              </div>
              <div className="text-[11px] text-gray-500 mb-1.5">2,340 XP · 660 to next level</div>
              <div className="flex gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-orange-500 font-semibold"><Flame className="w-3 h-3" />21 days</span>
                <span className="flex items-center gap-1 text-violet-500 font-semibold"><Zap className="w-3 h-3" />1.5× streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* TODAY Section */}
        <div className="mt-3 px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Today</p>

          {/* Today's Focus Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
            <div className="px-4 pt-3.5 pb-3 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Daily Focus</p>
                  <p className="text-[10px] text-gray-400">Saturday, March 21</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-violet-600">{progressPct}%</p>
                <p className="text-[10px] text-gray-400">{completedCount}/{habits.length} done</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="px-4 py-2 border-b border-gray-50">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>Daily Progress</span>
                <span>{completedCount}/{habits.length}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            {/* Up next habit */}
            <div className="p-3">
              <p className="text-[10px] font-bold text-amber-500 flex items-center gap-1 mb-2"><Zap className="w-3 h-3" />Up next</p>
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100 p-3 flex items-center gap-3">
                <span className="text-xl">🧘</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">Morning Meditation</p>
                  <p className="text-[10px] text-gray-400">Scheduled 7:00 AM · 0/3 tasks</p>
                </div>
                <button className="flex items-center gap-1 bg-gray-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-sm">
                  <Play className="w-3 h-3" fill="white" />Start
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 bg-gray-50 rounded-lg border border-gray-100 p-2.5 flex items-center gap-2">
                  <span className="text-base">📚</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-800 truncate">Read 30 Minutes</p>
                    <p className="text-[10px] text-gray-400">9:00 PM</p>
                  </div>
                  <button className="bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md">Start</button>
                </div>
              </div>
              <button className="w-full mt-2 text-[11px] text-gray-400 flex items-center justify-center gap-1 py-1">
                <ChevronDown className="w-3.5 h-3.5" />2 more habits
              </button>
            </div>
          </div>

          {/* Quick Tasks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><CheckSquare className="w-4 h-4 text-gray-400" />Quick Tasks</p>
              <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map(t => (
                <button key={t.id} className="flex items-center gap-2.5 w-full text-left" onClick={() => toggleTask(t.id)}>
                  <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${t.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`} style={{ width: 18, height: 18 }}>
                    {t.done && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-[12px] ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* YOUR HABITS Section */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-2.5">
            <button className="flex items-center gap-2" onClick={() => setHabitsOpen(v => !v)}>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Your Habits</p>
              <span className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">{habits.length}</span>
              {habitsOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            <button className="flex items-center gap-1 bg-violet-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-sm shadow-violet-200">
              <Plus className="w-3 h-3" />New Habit
            </button>
          </div>
          {habitsOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-3">
              {habits.map((h, i) => (
                <div key={h.id} className={`flex items-center gap-3 px-3.5 py-3 ${i < habits.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: h.color + '22' }}>
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
          )}
        </div>

        {/* PROGRESS Section */}
        <div className="px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Progress</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900">This Week</p>
              <span className="text-[10px] text-violet-600 font-semibold">+18% vs last week</span>
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {[65, 80, 45, 90, 70, 100, 25].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-sm" style={{ height: `${v * 0.6}px`, background: i === 6 ? '#e5e7eb' : 'linear-gradient(to top, #7c3aed, #a78bfa)' }} />
                  <span className="text-[8px] text-gray-400">{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3">
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
        </div>

        {/* TOOLS Section */}
        <div className="px-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Tools</p>
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {tools.map((t, i) => (
              <div key={i} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1.5 ${t.locked ? 'opacity-70' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${t.bg} flex items-center justify-center`}>
                  <t.icon className={`w-5 h-5 ${t.color}`} />
                </div>
                <p className="text-[11px] font-semibold text-gray-700 text-center leading-tight">{t.label}</p>
                {t.locked && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">{t.badge}</span>}
              </div>
            ))}
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
            <span className={`text-[10px] font-medium ${item.active ? 'text-violet-600' : 'text-gray-400'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
