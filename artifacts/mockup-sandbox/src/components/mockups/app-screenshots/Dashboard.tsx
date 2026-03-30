
import { Home, Leaf, Wrench, BarChart3, Settings, Flame, Zap, Crown, Check, Plus, ChevronRight } from "lucide-react";

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
      <div className="flex gap-1 items-center">
        <div className="flex gap-[2px] items-end h-3">
          {[2, 4, 6, 8].map((h, i) => (
            <div key={i} style={{ width: 3, height: h, background: i < 3 ? TEXT : MUTED, borderRadius: 1 }} />
          ))}
        </div>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none" style={{ marginLeft: 4 }}>
          <path d="M7.5 2C9.8 2 11.8 3 13.2 4.6L14.5 3.2C12.7 1.2 10.2 0 7.5 0C4.8 0 2.3 1.2 0.5 3.2L1.8 4.6C3.2 3 5.2 2 7.5 2Z" fill={TEXT} />
          <path d="M7.5 5C9 5 10.3 5.6 11.3 6.6L12.6 5.2C11.2 3.8 9.5 3 7.5 3C5.5 3 3.8 3.8 2.4 5.2L3.7 6.6C4.7 5.6 6 5 7.5 5Z" fill={TEXT} />
          <circle cx="7.5" cy="9" r="2" fill={TEXT} />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 1, marginLeft: 4 }}>
          <div style={{ width: 22, height: 11, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px 1px", display: "flex", alignItems: "center" }}>
            <div style={{ width: "75%", height: "100%", background: TEXT, borderRadius: 1 }} />
          </div>
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
    <div style={{ background: CARD, borderTop: `1px solid ${BORDER}` }} className="flex justify-around items-center pt-2 pb-5 px-2">
      {items.map(({ label, icon: Icon, id }) => {
        const isActive = id === active;
        return (
          <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: isActive ? PRIMARY : MUTED }}>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: isActive ? 600 : 400 }}>{label}</span>
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
    { emoji: "🧘", title: "Morning Meditation", streak: 47, done: true, color: "#34d399" },
    { emoji: "📚", title: "Read 30 Minutes", streak: 32, done: true, color: "#60a5fa" },
    { emoji: "🏃", title: "Evening Run", streak: 19, done: false, color: "#f59e0b" },
  ];

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 8px" }}>
        {/* Trial Banner */}
        <div style={{ background: "linear-gradient(135deg, #1e3d2a 0%, #0f2d1e 100%)", border: `1px solid ${PRIMARY}30`, borderRadius: 12, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="flex items-center gap-2">
            <Crown size={15} style={{ color: "#f59e0b" }} />
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 600 }}>Premium Trial — 6 days left</span>
          </div>
          <span style={{ fontSize: 11, color: PRIMARY, fontWeight: 600 }}>Upgrade →</span>
        </div>

        {/* Hero Card */}
        <div style={{ background: `linear-gradient(135deg, ${CARD} 0%, #1a3828 100%)`, border: `1px solid ${PRIMARY}25`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div className="flex items-center gap-3 mb-3">
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${PRIMARY}30 0%, #60a5fa20 100%)`, border: `2px solid ${PRIMARY}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
              🌿
            </div>
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 17, color: TEXT }}>Good morning, Alex</div>
              <div style={{ fontSize: 12, color: MUTED }}>You're on a 47-day streak 🔥</div>
            </div>
          </div>
          <div className="flex gap-3 mb-3">
            {[
              { label: "Streak", value: "47", icon: "🔥" },
              { label: "Level", value: "12", icon: "⚡" },
              { label: "XP", value: "2,840", icon: "✨" },
            ].map((s) => (
              <div key={s.label} style={{ flex: 1, background: "#0f2218", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{s.icon}</div>
                <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 16, color: PRIMARY }}>{s.value}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
              </div>
            ))}
          </div>
          {/* Week dots */}
          <div className="flex justify-between">
            {days.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: done[i] ? PRIMARY : BORDER, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done[i] ? <Check size={14} color="#0b1a13" strokeWidth={3} /> : null}
                </div>
                <span style={{ fontSize: 10, color: done[i] ? TEXT : MUTED }}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Habits */}
        <div style={{ marginBottom: 10 }}>
          <div className="flex justify-between items-center mb-3">
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 16, color: TEXT }}>Today's Habits</span>
            <span style={{ fontSize: 12, color: PRIMARY }}>2/3 done</span>
          </div>
          {habits.map((h, i) => (
            <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: h.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{h.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{h.title}</div>
                <div style={{ fontSize: 11, color: MUTED }}>🔥 {h.streak} day streak</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: h.done ? PRIMARY : BORDER, border: h.done ? "none" : `2px solid ${MUTED}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {h.done && <Check size={14} color="#0b1a13" strokeWidth={3} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
