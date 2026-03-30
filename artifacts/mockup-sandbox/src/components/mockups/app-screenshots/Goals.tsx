
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

export default function Goals() {
  const goals = [
    { title: "Run a 5K", category: "health", catColor: "#16a34a", catBg: "#dcfce7", catBorder: "#86efac", emoji: "🏃", pct: 65, days: 28, milestones: [{ done: true, text: "Run 1km without stopping" }, { done: true, text: "Complete 3km training run" }, { done: false, text: "Run 5km in under 35 min" }], linked: "Daily Run" },
    { title: "Read 12 Books This Year", category: "personal", catColor: "#7c3aed", catBg: "#f5f3ff", catBorder: "#c4b5fd", emoji: "📚", pct: 42, days: 14, milestones: [{ done: true, text: "Finish first book" }, { done: true, text: "Read 5 books" }, { done: false, text: "Complete 12 books" }], linked: "Read 30 Minutes" },
  ];

  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 18, color: C.muted }}>←</span>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Goals</div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>✨ Premium</div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white" }}>+</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "hidden", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Summary stats */}
        <div style={{ display: "flex", gap: 8 }}>
          {[["🎯","2","Active"],["✅","4","Milestones"],["📈","53%","Avg Progress"]].map(([icon, val, label]) => (
            <div key={label} style={{ flex: 1, background: C.card, borderRadius: 12, padding: "10px 8px", border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 16 }}>{icon}</div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>{val}</div>
              <div style={{ fontSize: 10, color: C.muted }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Goal cards */}
        {goals.map((g, gi) => (
          <div key={gi} style={{ background: C.card, borderRadius: 18, border: `1.5px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
            {/* Card header */}
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{g.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: C.text }}>{g.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <div style={{ background: g.catBg, border: `1px solid ${g.catBorder}`, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 600, color: g.catColor }}>{g.category}</div>
                      <span style={{ fontSize: 11, color: C.muted }}>📅 {g.days} days left</span>
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 16, color: C.muted }}>⌄</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Progress</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: g.catColor }}>{g.pct}%</span>
              </div>
              <div style={{ height: 8, background: `${g.catColor}1a`, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${g.pct}%`, height: "100%", background: g.catColor, borderRadius: 4 }} />
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>🔗 Linked to: {g.linked}</div>
            </div>
            {/* Milestones */}
            <div style={{ padding: "10px 16px" }}>
              {g.milestones.map((m, mi) => (
                <div key={mi} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: mi < g.milestones.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: m.done ? g.catColor : "transparent", border: `2px solid ${m.done ? g.catColor : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {m.done && <span style={{ fontSize: 10, color: "white" }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: m.done ? C.muted : C.text, textDecoration: m.done ? "line-through" : "none" }}>{m.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Add goal CTA */}
        <div style={{ background: C.pLight, border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎯</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.primary }}>Add a new goal</span>
        </div>
      </div>
      <Nav active={2} />
    </div>
  );
}
