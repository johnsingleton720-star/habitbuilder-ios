
import { Home, Leaf, Wrench, BarChart3, Settings, ArrowLeft, Check, Sparkles } from "lucide-react";

const BG = "#eef4f1";
const CARD = "#ffffff";
const PRIMARY = "#1a7a50";
const TEXT = "#0d2318";
const MUTED = "#56736a";
const BORDER = "#c5dbd2";
const SECONDARY = "#d4ece4";
const PRIMARYLIGHT = "#e8f5ef";

function StatusBar() {
  return (
    <div style={{ background: CARD, color: TEXT }} className="flex justify-between items-center px-5 pt-3 pb-1">
      <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15 }}>9:41</span>
      <div style={{ width: 18, height: 10, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px", display: "flex", alignItems: "center" }}>
        <div style={{ width: "70%", height: "100%", background: TEXT, borderRadius: 1 }} />
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
    <div style={{ background: CARD, borderTop: `1px solid ${BORDER}`, boxShadow: "0 -1px 8px rgba(0,0,0,0.06)" }}
      className="flex justify-around items-center pt-2 pb-5 px-2">
      {items.map(({ label, icon: Icon, id }) => (
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "habits" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "habits" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "habits" ? 600 : 400 }}>{label}</span>
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
  const pct = 42;
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "10px 16px 12px" }}>
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
        <div style={{ background: BG, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px" }}>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 12, color: MUTED }}>Weekly progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: SECONDARY, borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: PRIMARY, borderRadius: 4 }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        {days.map((d, di) => (
          <div key={di} style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, color: di < 2 ? PRIMARY : MUTED, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{d.day}</span>
              {di < 2 && <span style={{ background: PRIMARYLIGHT, color: PRIMARY, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>Complete ✓</span>}
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              {d.tasks.map((t, ti) => (
                <div key={ti} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderBottom: ti < d.tasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: t.done ? PRIMARY : "transparent", border: t.done ? "none" : `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {t.done && <Check size={11} color="white" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 15, flexShrink: 0 }}>{t.emoji}</span>
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
