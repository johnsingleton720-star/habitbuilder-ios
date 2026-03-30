
import { Home, Leaf, Wrench, BarChart3, Settings, Zap, Lock } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "progress" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "progress" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "progress" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const earned = [
  { emoji: "🔥", label: "47-Day Warrior", color: "#f59e0b", glow: true },
  { emoji: "🌅", label: "Early Riser", color: "#60a5fa", glow: false },
  { emoji: "👑", label: "Consistency King", color: PRIMARY, glow: false },
  { emoji: "🧘", label: "Mindful Master", color: "#a78bfa", glow: false },
  { emoji: "🤖", label: "AI Partner", color: "#34d399", glow: false },
  { emoji: "🎯", label: "Goal Crusher", color: "#f87171", glow: false },
];
const locked = [
  { label: "100-Day Legend" },
  { label: "Speed Reader" },
  { label: "Ironman" },
];

export function Achievements() {
  const xp = 2840;
  const xpMax = 3000;
  const pct = Math.round((xp / xpMax) * 100);

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT, marginBottom: 2 }}>Achievements</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>6 badges earned · Level 12</div>

        {/* Featured badge */}
        <div style={{ background: "linear-gradient(135deg, #2d1f00 0%, #1a1200 100%)", border: "1px solid #f59e0b40", borderRadius: 20, padding: 20, marginBottom: 14, textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(circle at 50% 0%, #f59e0b12 0%, transparent 70%)" }} />
          <div style={{ fontSize: 64, marginBottom: 6, filter: "drop-shadow(0 0 20px #f59e0b60)" }}>🔥</div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 18, color: TEXT, marginBottom: 2 }}>47-Day Warrior</div>
          <div style={{ fontSize: 12, color: "#f59e0b" }}>Longest streak achievement</div>
        </div>

        {/* Level/XP */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div className="flex justify-between items-center mb-2">
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 18, color: TEXT }}>Level 12</div>
              <div style={{ fontSize: 12, color: MUTED }}>Habit Champion</div>
            </div>
            <div style={{ background: PRIMARY + "20", borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={14} style={{ color: PRIMARY }} />
              <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, color: PRIMARY, fontSize: 15 }}>2,840 XP</span>
            </div>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <span style={{ fontSize: 11, color: MUTED }}>Progress to Level 13</span>
            <span style={{ fontSize: 11, color: MUTED }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: BORDER, borderRadius: 5 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${PRIMARY} 0%, #60a5fa 100%)`, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>160 XP until Level 13</div>
        </div>

        {/* Badge grid */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>Badges Earned</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          {earned.map((b, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${b.glow ? b.color + "60" : BORDER}`, borderRadius: 14, padding: "14px 8px", textAlign: "center", boxShadow: b.glow ? `0 0 16px ${b.color}25` : "none" }}>
              <div style={{ fontSize: 30, marginBottom: 4 }}>{b.emoji}</div>
              <div style={{ fontSize: 10, color: b.color, fontWeight: 600, lineHeight: 1.3 }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* Locked */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>Locked Badges</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {locked.map((b, i) => (
            <div key={i} style={{ background: "#0f2218", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 8px", textAlign: "center", opacity: 0.5 }}>
              <div style={{ fontSize: 24, marginBottom: 4, filter: "grayscale(1)" }}><Lock size={26} style={{ color: MUTED, margin: "0 auto" }} /></div>
              <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, lineHeight: 1.3 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
