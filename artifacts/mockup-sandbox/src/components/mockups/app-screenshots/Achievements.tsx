
const C = { bg: "#eef4f1", card: "#fff", primary: "#1a7a50", text: "#0d2318", muted: "#56736a", border: "#c5dbd2", pLight: "#e8f5ef", secondary: "#d4ece4" };

const Nav = ({ active }: { active: number }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 76, background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-around", paddingBottom: 8 }}>
    {["🏠","🌿","🔧","📊","⚙️"].map((icon, i) => (
      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 10, color: i === active ? C.primary : C.muted, fontWeight: i === active ? 700 : 400 }}>{["Home","Habits","Tools","Progress","Account"][i]}</span>
      </div>
    ))}
  </div>
);

export default function Achievements() {
  const viewTabs = ["Today","Yesterday","Weekly","Streaks","All-Time"];
  const badges = [
    { emoji: "🔥", title: "Week Warrior", desc: "7-day streak achieved", xp: 100, earned: true, color: "#f97316" },
    { emoji: "⚡", title: "Speed Demon", desc: "Complete 5 tasks in one day", xp: 75, earned: true, color: "#eab308" },
    { emoji: "🧘", title: "Zen Master", desc: "10 meditation sessions", xp: 150, earned: true, color: "#7c3aed" },
    { emoji: "🏆", title: "Month Strong", desc: "30-day streak", xp: 500, earned: false, color: "#c2410c" },
    { emoji: "📚", title: "Knowledge Seeker", desc: "Read for 20 consecutive days", xp: 250, earned: false, color: "#2563eb" },
    { emoji: "⭐", title: "Perfect Week", desc: "100% completion for 7 days", xp: 200, earned: false, color: "#16a34a" },
  ];

  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "0 16px 12px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <span style={{ fontSize: 18, color: C.muted }}>←</span>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Progress</div>
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>Monday, March 30, 2026</div>
      </div>

      {/* XP card */}
      <div style={{ margin: "0 14px 12px", background: `linear-gradient(135deg, ${C.primary}, #15a05a)`, borderRadius: 20, padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Total XP Earned</div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 36, fontWeight: 800, color: "white" }}>1,240</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Level 4 · Habit Builder</div>
          </div>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>⚡</div>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>Next level: 1,500 XP</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 700 }}>83%</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.25)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: "83%", height: "100%", background: "white", borderRadius: 3 }} />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", flexShrink: 0 }}>
        {viewTabs.map((t, i) => (
          <div key={i} style={{ padding: "6px 10px", borderRadius: 16, background: i === 3 ? C.primary : C.card, border: `1px solid ${i === 3 ? C.primary : C.border}`, fontSize: 11, fontWeight: i === 3 ? 700 : 400, color: i === 3 ? "white" : C.muted, whiteSpace: "nowrap" }}>{t}</div>
        ))}
      </div>

      {/* Streaks section */}
      <div style={{ padding: "0 14px 10px", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[["🔥","12d","Current"],["🏆","21d","Best Ever"],["📅","67","Days Active"]].map(([icon, val, label]) => (
            <div key={label} style={{ flex: 1, background: C.card, borderRadius: 14, padding: "12px 8px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 18 }}>{icon}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>{val}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement badges label */}
      <div style={{ padding: "0 14px 8px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 4, height: 14, borderRadius: 2, background: C.primary }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Achievements</span>
        <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>3 of 6 earned</span>
      </div>

      {/* Badge grid */}
      <div style={{ padding: "0 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {badges.map((b, i) => (
          <div key={i} style={{ background: b.earned ? C.card : `${C.bg}`, borderRadius: 16, padding: "12px 8px", border: `1.5px solid ${b.earned ? b.color + "44" : C.border}`, textAlign: "center", opacity: b.earned ? 1 : 0.55 }}>
            <div style={{ fontSize: 28, marginBottom: 4, filter: b.earned ? "none" : "grayscale(100%)" }}>{b.emoji}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: b.earned ? C.text : C.muted, lineHeight: 1.3 }}>{b.title}</div>
            <div style={{ fontSize: 10, color: b.earned ? b.color : C.muted, fontWeight: 600, marginTop: 3 }}>+{b.xp} XP</div>
          </div>
        ))}
      </div>

      <Nav active={3} />
    </div>
  );
}
