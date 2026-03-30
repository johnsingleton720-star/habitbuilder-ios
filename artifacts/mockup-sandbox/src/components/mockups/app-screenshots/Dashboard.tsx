
import { Home, Leaf, Wrench, BarChart3, Settings, Check, Crown, Zap, Flame } from "lucide-react";

// Exact light theme colors from client/src/index.css
const BG = "#eef4f1";       // hsl(160 15% 95%)
const CARD = "#ffffff";
const PRIMARY = "#1a7a50";  // hsl(164 80% 32%) rich emerald
const TEXT = "#0d2318";     // hsl(164 45% 12%)
const MUTED = "#56736a";    // hsl(164 25% 38%)
const BORDER = "#c5dbd2";   // hsl(164 22% 82%)
const SECONDARY = "#d4ece4";// hsl(162 35% 86%)
const PRIMARYLIGHT = "#e8f5ef"; // primary/10

function StatusBar() {
  return (
    <div style={{ background: CARD, color: TEXT }} className="flex justify-between items-center px-5 pt-3 pb-1">
      <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15 }}>9:41</span>
      <div className="flex gap-1.5 items-center">
        <div className="flex gap-[2px] items-end h-3">
          {[3, 5, 7, 9].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i < 3 ? TEXT : BORDER, borderRadius: 1 }} />
          ))}
        </div>
        <div style={{ width: 18, height: 10, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px", display: "flex", alignItems: "center" }}>
          <div style={{ width: "70%", height: "100%", background: TEXT, borderRadius: 1 }} />
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active }: { active: string }) {
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
      {items.map(({ label, icon: Icon, id }) => {
        const isActive = id === active;
        return (
          <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: isActive ? PRIMARY : MUTED }}>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: isActive ? 600 : 400 }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Dashboard() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const done = [true, true, true, true, true, false, false];
  const habits = [
    { emoji: "🧘", title: "Morning Meditation", streak: 47, done: true },
    { emoji: "📚", title: "Read 30 Minutes", streak: 32, done: true },
    { emoji: "🏃", title: "Evening Run", streak: 19, done: false },
  ];

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>

        {/* Trial Banner */}
        <div style={{ background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}30`, borderRadius: 12, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="flex items-center gap-2">
            <Crown size={14} style={{ color: "#d97706" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Premium Trial — 6 days left</span>
          </div>
          <span style={{ fontSize: 12, color: PRIMARY, fontWeight: 700 }}>Upgrade →</span>
        </div>

        {/* Hero Card */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: PRIMARYLIGHT, border: `2px solid ${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🌿</div>
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 17, color: TEXT }}>Good morning, Alex</div>
              <div style={{ fontSize: 12, color: MUTED }}>You're on a 47-day streak 🔥</div>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {[{ label: "Streak", value: "47🔥" }, { label: "Level", value: "12⚡" }, { label: "XP", value: "2,840" }].map((s) => (
              <div key={s.label} style={{ flex: 1, background: BG, borderRadius: 10, padding: "7px 4px", textAlign: "center", border: `1px solid ${BORDER}` }}>
                <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: PRIMARY }}>{s.value}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Week dots */}
          <div className="flex justify-between">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: done[i] ? PRIMARY : SECONDARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done[i] ? <Check size={14} color="white" strokeWidth={3} /> : <span style={{ fontSize: 11, color: MUTED }}></span>}
                </div>
                <span style={{ fontSize: 10, color: done[i] ? TEXT : MUTED, fontWeight: done[i] ? 600 : 400 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Habits */}
        <div className="flex justify-between items-center mb-3">
          <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 16, color: TEXT }}>Today's Habits</span>
          <span style={{ fontSize: 12, color: PRIMARY, fontWeight: 600 }}>2 / 3 done</span>
        </div>
        {habits.map((h, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: PRIMARYLIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{h.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{h.title}</div>
              <div style={{ fontSize: 11, color: MUTED }}>🔥 {h.streak} day streak</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: h.done ? PRIMARY : "transparent", border: h.done ? "none" : `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {h.done && <Check size={13} color="white" strokeWidth={3} />}
            </div>
          </div>
        ))}
      </div>
      <BottomNav active="home" />
    </div>
  );
}
