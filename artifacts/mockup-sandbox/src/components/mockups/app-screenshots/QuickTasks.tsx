
import { Home, Leaf, Wrench, BarChart3, Settings, Plus, Check, X } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "home" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "home" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "home" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const tasks = [
  { text: "Buy groceries", done: true },
  { text: "Call dentist to reschedule", done: true },
  { text: "Review project proposal", done: true },
  { text: "Finish quarterly report", done: false },
  { text: "Book flights for June trip", done: false },
  { text: "Reply to client emails", done: false },
  { text: "Set up monthly savings transfer", done: false },
  { text: "Order birthday gift for Sarah", done: false },
];

export function QuickTasks() {
  const done = tasks.filter(t => t.done).length;
  const pct = Math.round((done / tasks.length) * 100);
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT }}>Quick Tasks</div>
            <div style={{ fontSize: 13, color: MUTED }}>{done} of {tasks.length} done today</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} color="white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Progress */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 16px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <div className="flex justify-between items-center mb-2">
            <span style={{ fontSize: 13, color: MUTED }}>Today's progress</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{pct}%</span>
          </div>
          <div style={{ height: 7, background: SECONDARY, borderRadius: 4 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: PRIMARY, borderRadius: 4 }} />
          </div>
        </div>

        {/* Task list */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {tasks.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderBottom: i < tasks.length - 1 ? `1px solid ${BORDER}` : "none", background: t.done ? "#fafffe" : CARD }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: t.done ? PRIMARY : "transparent", border: t.done ? "none" : `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.done && <Check size={12} color="white" strokeWidth={3} />}
              </div>
              <span style={{ flex: 1, fontSize: 14, color: t.done ? MUTED : TEXT, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
              <X size={15} style={{ color: BORDER, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Motivational card */}
        <div style={{ background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}25`, borderRadius: 14, padding: 14, marginTop: 14, textAlign: "center" }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>⚡</div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>3 tasks done! <span style={{ color: TEXT, fontWeight: 600 }}>You're building momentum.</span> Each small win compounds over time.</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
