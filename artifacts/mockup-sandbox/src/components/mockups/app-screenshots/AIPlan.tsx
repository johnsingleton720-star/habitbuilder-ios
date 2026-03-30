
import { Home, Leaf, Wrench, BarChart3, Settings, ArrowLeft, Check, ChevronRight, Sparkles } from "lucide-react";

const BG = "#0b1a13";
const CARD = "#152d20";
const PRIMARY = "#34d399";
const TEXT = "#edf3f0";
const MUTED = "#7fb39e";
const BORDER = "#1e3d2a";

function StatusBar() {
  return (
    <div style={{ background: BG, color: TEXT }} className="flex justify-between items-center px-6 pt-3 pb-1 text-sm font-semibold">
      <span style={{ fontFamily: "Outfit, sans-serif" }}>9:41</span>
      <div style={{ width: 22, height: 11, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px 1px", display: "flex", alignItems: "center" }}>
        <div style={{ width: "75%", height: "100%", background: TEXT, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function BottomNav() {
  const items = [
    { label: "Dashboard", icon: Home, id: "home" },
    { label: "Habits", icon: Leaf, id: "habits" },
    { label: "Tools", icon: Wrench, id: "tools" },
    { label: "Progress", icon: BarChart3, id: "progress" },
    { label: "Account", icon: Settings, id: "account" },
  ];
  return (
    <div style={{ background: CARD, borderTop: `1px solid ${BORDER}` }} className="flex justify-around items-center pt-2 pb-5 px-2">
      {items.map(({ label, icon: Icon, id }) => (
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "habits" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "habits" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "habits" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const days = [
  { day: "Monday", tasks: [{ emoji: "🧘", text: "Meditate 10 min", done: true }, { emoji: "📚", text: "Read 20 pages", done: true }, { emoji: "🏃", text: "5km morning run", done: true }] },
  { day: "Tuesday", tasks: [{ emoji: "🧘", text: "Meditate 10 min", done: true }, { emoji: "❄️", text: "Cold shower", done: true }, { emoji: "📔", text: "Gratitude journal", done: false }] },
  { day: "Wednesday", tasks: [{ emoji: "🧘", text: "Meditate 15 min", done: false }, { emoji: "📚", text: "Read 25 pages", done: false }, { emoji: "🏋️", text: "Strength training", done: false }] },
  { day: "Thursday", tasks: [{ emoji: "🧘", text: "Meditate 10 min", done: false }, { emoji: "🏃", text: "6km run", done: false }, { emoji: "📔", text: "Evening reflection", done: false }] },
];

export function AIPlan() {
  const completedTasks = 5;
  const totalTasks = 12;
  const pct = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: "10px 16px 12px", background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-3">
          <ArrowLeft size={20} style={{ color: MUTED }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 17, color: TEXT }}>Morning Meditation</div>
            <div className="flex items-center gap-1">
              <Sparkles size={11} style={{ color: PRIMARY }} />
              <span style={{ fontSize: 12, color: MUTED }}>AI Plan · Week 4 of 8</span>
            </div>
          </div>
        </div>
        {/* Progress */}
        <div style={{ background: "#0f2218", borderRadius: 10, padding: "8px 12px" }}>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 12, color: MUTED }}>Weekly progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: BORDER, borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${PRIMARY} 0%, #60a5fa 100%)`, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Days */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {days.map((d, di) => (
          <div key={di} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, color: di < 2 ? PRIMARY : MUTED, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{d.day}</span>
              {di < 2 && <span style={{ background: PRIMARY + "20", color: PRIMARY, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>Complete ✓</span>}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              {d.tasks.map((t, ti) => (
                <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: ti < d.tasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: t.done ? PRIMARY : BORDER, border: t.done ? "none" : `2px solid ${MUTED}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.done && <Check size={12} color="#0b1a13" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{t.emoji}</span>
                  <span style={{ fontSize: 13, color: t.done ? MUTED : TEXT, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
