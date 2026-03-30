
const C = { bg: "#eef4f1", card: "#fff", primary: "#1a7a50", text: "#0d2318", muted: "#56736a", border: "#c5dbd2", secondary: "#d4ece4", pLight: "#e8f5ef" };

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

export default function Dashboard() {
  const habits = [
    { emoji: "🧘", title: "Morning Meditation", streak: 12, pct: 70, color: "#7c3aed", pastel: "#f5f0ff" },
    { emoji: "🏃", title: "Daily Run", streak: 5, pct: 40, color: "#ef4444", pastel: "#fff5f5" },
    { emoji: "📚", title: "Read 30 Minutes", streak: 21, pct: 90, color: "#2563eb", pastel: "#eff6ff" },
  ];

  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>
      {/* Header */}
      <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: C.primary }}>HabitBuilder</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}>12d</span>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.secondary, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Week strip */}
        <div style={{ background: C.card, borderRadius: 14, padding: "10px 16px", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{d}</span>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? C.primary : i === 3 ? C.pLight : "transparent", border: `1.5px solid ${i <= 3 ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i < 3 && <span style={{ fontSize: 11, color: "white" }}>✓</span>}
                  {i === 3 && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary }}>30</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero card */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, #15a05a)`, borderRadius: 20, padding: "14px 16px" }}>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 10 }}>Great momentum — 3 habits today. Keep it up!</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["1","Done"],["3","Today"],["33%","Rate"]].map(([n, l]) => (
              <div key={l} style={{ flex: 1, background: "rgba(255,255,255,0.18)", borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "white", fontFamily: "'Outfit', sans-serif" }}>{n}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.8)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 4, height: 14, borderRadius: 2, background: C.primary }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Today</span>
        </div>

        {/* Habit Cards */}
        {habits.map((h, i) => (
          <div key={i} style={{ background: h.pastel, borderRadius: 20, padding: "16px 18px", border: `2px solid ${h.color}22`, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 4, borderRadius: "0 3px 3px 0", background: h.color }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{h.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 17, fontWeight: 800, color: C.text, marginBottom: 2 }}>{h.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#c2410c", fontWeight: 600 }}>🔥 {h.streak}d streak</span>
                  <span style={{ fontSize: 11, color: h.color, fontWeight: 700 }}>Start →</span>
                </div>
                <div style={{ height: 4, background: "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden", marginTop: 6 }}>
                  <div style={{ width: `${h.pct}%`, height: "100%", background: h.color, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Nav active={0} />
    </div>
  );
}
