
import { Home, Leaf, Wrench, BarChart3, Settings, Zap, Lock } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "progress" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "progress" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "progress" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const earned = [
  { emoji: "🔥", label: "47-Day Warrior", color: "#d97706", bg: "#fef3c7", featured: true },
  { emoji: "🌅", label: "Early Riser", color: "#2563eb", bg: "#dbeafe" },
  { emoji: "👑", label: "Consistency King", color: PRIMARY, bg: PRIMARYLIGHT },
  { emoji: "🧘", label: "Mindful Master", color: "#7c3aed", bg: "#ede9fe" },
  { emoji: "🤖", label: "AI Partner", color: PRIMARY, bg: PRIMARYLIGHT },
  { emoji: "🎯", label: "Goal Crusher", color: "#dc2626", bg: "#fee2e2" },
];
const locked = ["100-Day Legend", "Speed Reader", "Ironman"];

export function Achievements() {
  const xp = 2840, xpMax = 3000;
  const pct = Math.round((xp / xpMax) * 100);
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT, marginBottom: 2 }}>Achievements</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>6 badges earned · Level 12</div>

        {/* Featured badge */}
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 20, padding: 20, marginBottom: 14, textAlign: "center", boxShadow: "0 2px 8px rgba(217,119,6,0.1)" }}>
          <div style={{ fontSize: 60, marginBottom: 6 }}>🔥</div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 2 }}>47-Day Warrior</div>
          <div style={{ fontSize: 12, color: "#d97706", fontWeight: 600 }}>Longest streak achievement</div>
        </div>

        {/* Level/XP */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 18, color: TEXT }}>Level 12</div>
              <div style={{ fontSize: 12, color: MUTED }}>Habit Champion</div>
            </div>
            <div style={{ background: PRIMARYLIGHT, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={14} style={{ color: PRIMARY }} />
              <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, color: PRIMARY, fontSize: 15 }}>2,840 XP</span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 11, color: MUTED }}>Progress to Level 13</span>
            <span style={{ fontSize: 11, color: MUTED }}>{pct}%</span>
          </div>
          <div style={{ height: 7, background: SECONDARY, borderRadius: 5 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: PRIMARY, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>160 XP until Level 13</div>
        </div>

        {/* Badge grid */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>Badges Earned</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {earned.map((b, i) => (
            <div key={i} style={{ background: b.bg, border: `1px solid ${b.color}30`, borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>{b.emoji}</div>
              <div style={{ fontSize: 10, color: b.color, fontWeight: 700, lineHeight: 1.3 }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* Locked */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>Coming Up</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {locked.map((b, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 8px", textAlign: "center", opacity: 0.55 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><Lock size={22} style={{ color: MUTED }} /></div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, lineHeight: 1.3 }}>{b}</div>
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
