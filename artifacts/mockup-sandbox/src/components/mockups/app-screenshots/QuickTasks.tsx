
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

export default function QuickTasks() {
  const tasks = [
    { done: true, text: "Buy journal notebook", priority: "low" },
    { done: true, text: "Schedule doctor check-up", priority: "high" },
    { done: false, text: "Call mum this evening", priority: "medium" },
    { done: false, text: "Prepare tomorrow's lunch", priority: "low" },
    { done: false, text: "Review weekly goals", priority: "high" },
    { done: false, text: "Declutter desk space", priority: "low" },
    { done: false, text: "Renew gym membership", priority: "medium" },
  ];

  const priorityColor: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };

  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: C.primary }}>HabitBuilder</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 20, padding: "4px 10px" }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}>12d</span>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.secondary, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "hidden", padding: "0 14px 80px" }}>
        {/* Daily quote */}
        <div style={{ background: C.card, borderRadius: 16, padding: "12px 14px", marginBottom: 10, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic", lineHeight: 1.5 }}>"Small daily improvements over time lead to stunning results."</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 4, textAlign: "right" }}>— Robin Sharma</div>
        </div>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 4, height: 14, borderRadius: 2, background: C.primary }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.12em" }}>Quick Tasks</span>
        </div>

        {/* Quick tasks card */}
        <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 12 }}>
          {/* Card header */}
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>My Tasks</span>
              <div style={{ background: C.secondary, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, color: C.primary }}>2 done</div>
            </div>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white" }}>+</div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: "8px 16px", background: C.pLight, borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: C.muted }}>2 of 7 completed</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>29%</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: "29%", height: "100%", background: C.primary, borderRadius: 2 }} />
            </div>
          </div>

          {/* Task list */}
          <div>
            {tasks.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: i < tasks.length - 1 ? `1px solid ${C.border}` : "none", background: t.done ? `${C.pLight}80` : "white" }}>
                <div style={{ width: 22, height: 22, borderRadius: 7, background: t.done ? C.primary : "transparent", border: `2px solid ${t.done ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {t.done && <span style={{ fontSize: 12, color: "white" }}>✓</span>}
                </div>
                <span style={{ flex: 1, fontSize: 13, color: t.done ? C.muted : C.text, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</span>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor[t.priority], flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Mood check */}
        <div style={{ background: C.card, borderRadius: 16, padding: "12px 14px", border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>How's your energy today?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["😄","😊","😐","😔","😢"].map((e, i) => (
              <div key={i} style={{ flex: 1, height: 36, borderRadius: 10, background: i === 1 ? C.pLight : C.bg, border: `1.5px solid ${i === 1 ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{e}</div>
            ))}
          </div>
        </div>
      </div>

      <Nav active={0} />
    </div>
  );
}
