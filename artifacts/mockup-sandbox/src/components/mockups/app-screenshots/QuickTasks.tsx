
import { Home, Leaf, Wrench, BarChart3, Settings, Plus, Check, X } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "home" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "home" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "home" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const tasks = [
  { text: "Buy groceries", done: true },
  { text: "Call dentist", done: true },
  { text: "Review project proposal", done: true },
  { text: "Finish quarterly report", done: false },
  { text: "Book flights for June trip", done: false },
  { text: "Reply to client emails", done: false },
  { text: "Set up savings transfer", done: false },
  { text: "Order birthday gift for Sarah", done: false },
];

export function QuickTasks() {
  const done = tasks.filter(t => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT }}>Quick Tasks</div>
            <div style={{ fontSize: 13, color: MUTED }}>Today · {done} of {tasks.length} done</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} color="#0b1a13" strokeWidth={2.5} />
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16 }}>
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 13, color: MUTED }}>Today's progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{pct}%</span>
          </div>
          <div style={{ height: 7, background: BORDER, borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${PRIMARY} 0%, #60a5fa 100%)`, borderRadius: 4, transition: "width 0.4s ease" }} />
          </div>
        </div>

        {/* Tasks */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {tasks.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < tasks.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: t.done ? PRIMARY : "transparent", border: t.done ? "none" : `2px solid ${MUTED}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.done && <Check size={13} color="#0b1a13" strokeWidth={3} />}
              </div>
              <span style={{ flex: 1, fontSize: 14, color: t.done ? MUTED : TEXT, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
              <X size={16} style={{ color: BORDER, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Motivation */}
        <div style={{ background: "linear-gradient(135deg, #1a3828 0%, #152d20 100%)", border: `1px solid ${PRIMARY}25`, borderRadius: 14, padding: 14, marginTop: 14, textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>⚡</div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>3 tasks done today! <span style={{ color: TEXT, fontWeight: 600 }}>You're building momentum.</span> Keep going — each small win compounds.</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
