
import { Home, Leaf, Wrench, BarChart3, Settings, Plus } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "tools" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "tools" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "tools" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function CircleProgress({ pct, color, size = 68, emoji }: { pct: number; color: string; size?: number; emoji: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={SECONDARY} strokeWidth={7} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={7} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{emoji}</div>
    </div>
  );
}

const goals = [
  { emoji: "🏃", title: "Run a 5K", pct: 73, detail: "22 of 30 sessions", status: "On Track", statusColor: PRIMARY, statusBg: PRIMARYLIGHT, daysLeft: 8 },
  { emoji: "📚", title: "Read 24 Books", pct: 58, detail: "14 of 24 books", status: "On Track", statusColor: "#2563eb", statusBg: "#dbeafe", daysLeft: 45 },
  { emoji: "🧘", title: "Meditate Daily", pct: 91, detail: "47-day streak", status: "Crushing It 🔥", statusColor: "#d97706", statusBg: "#fef3c7", daysLeft: 4 },
  { emoji: "💪", title: "Strength 3x/week", pct: 42, detail: "6 of 12 sessions", status: "Behind", statusColor: "#dc2626", statusBg: "#fee2e2", daysLeft: 20 },
];

export function Goals() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT }}>My Goals</div>
            <div style={{ fontSize: 13, color: MUTED }}>Q2 2026 · 3 on track</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} color="white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 16, display: "flex", gap: 16, alignItems: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <CircleProgress pct={66} color={PRIMARY} emoji="🎯" size={76} />
          <div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 20, color: TEXT }}>66% Overall</div>
            <div style={{ fontSize: 13, color: MUTED }}>3 of 4 goals on track</div>
            <div style={{ marginTop: 4, fontSize: 12, color: PRIMARY, fontWeight: 700 }}>Great momentum! 💪</div>
          </div>
        </div>

        {goals.map((g, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div className="flex gap-4 items-center mb-3">
              <CircleProgress pct={g.pct} color={g.statusColor} emoji={g.emoji} size={64} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 2 }}>{g.title}</div>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 6 }}>{g.detail}</div>
                <div className="flex items-center gap-2">
                  <span style={{ background: g.statusBg, color: g.statusColor, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{g.status}</span>
                  <span style={{ fontSize: 11, color: MUTED }}>{g.daysLeft}d left</span>
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: SECONDARY, borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${g.pct}%`, background: g.statusColor, borderRadius: 3 }} />
            </div>
          </div>
        ))}

        <div style={{ border: `2px dashed ${BORDER}`, borderRadius: 16, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Plus size={17} style={{ color: MUTED }} />
          <span style={{ fontSize: 14, color: MUTED }}>Add a new goal</span>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
