
const C = { bg: "#eef4f1", card: "#fff", primary: "#1a7a50", text: "#0d2318", muted: "#56736a", border: "#c5dbd2", pLight: "#e8f5ef" };

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

export default function Analytics() {
  const tabs = ["Overview","Habits","Wellness","Activity","Trends","AI Report"];
  const habits = [
    { emoji: "🧘", title: "Morning Meditation", pct: 87, color: "#7c3aed", sessions: 24 },
    { emoji: "🏃", title: "Daily Run", pct: 56, color: "#ef4444", sessions: 15 },
    { emoji: "📚", title: "Read 30 Minutes", pct: 93, color: "#2563eb", sessions: 26 },
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 18, color: C.muted }}>←</span>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Advanced Analytics</div>
          <div style={{ marginLeft: "auto", background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>✨ Premium</div>
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>March 2026 · 30-day overview</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", overflowX: "hidden", flexShrink: 0 }}>
        {tabs.map((t, i) => (
          <div key={i} style={{ padding: "6px 12px", borderRadius: 20, background: i === 0 ? C.primary : C.card, border: `1px solid ${i === 0 ? C.primary : C.border}`, whiteSpace: "nowrap", fontSize: 12, fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "white" : C.muted }}>
            {t}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "hidden", padding: "0 14px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[["📅","65","Sessions"],["⏱️","48h","Total Time"],["🔥","12d","Best Streak"],["✅","76%","Completion"]].map(([icon, val, label]) => (
            <div key={label} style={{ background: C.card, borderRadius: 14, padding: "14px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: C.text }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: C.card, borderRadius: 16, padding: "14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Weekly Completion Rate</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
            {[60,80,45,90,70,85,76].map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", height: h * 0.7, background: i === 6 ? C.primary : `${C.primary}55`, borderRadius: "4px 4px 0 0" }} />
                <span style={{ fontSize: 9, color: C.muted }}>{"MTWTFSS"[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Habit breakdown */}
        <div style={{ background: C.card, borderRadius: 16, padding: "14px", border: `1px solid ${C.border}` }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 10 }}>Habit Breakdown</div>
          {habits.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < habits.length - 1 ? 12 : 0 }}>
              <span style={{ fontSize: 18 }}>{h.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{h.title}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: h.color }}>{h.pct}%</span>
                </div>
                <div style={{ height: 6, background: `${h.color}22`, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${h.pct}%`, height: "100%", background: h.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{h.sessions} sessions this month</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Nav active={3} />
    </div>
  );
}
