
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

export default function AIPlan() {
  const tasks = [
    { done: true, title: "5-minute breathing exercise", time: "7:00 AM", xp: 10 },
    { done: true, title: "Body scan meditation", time: "7:05 AM", xp: 15 },
    { done: false, title: "Gratitude journaling (3 things)", time: "7:15 AM", xp: 20 },
    { done: false, title: "Set daily intention", time: "7:25 AM", xp: 10 },
    { done: false, title: "Mindful movement (gentle stretches)", time: "7:30 AM", xp: 15 },
  ];

  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 18, color: C.muted }}>←</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>🧘 Morning Meditation</div>
          <div style={{ fontSize: 12, color: C.muted }}>AI-Generated Plan · 30 days</div>
        </div>
        <div style={{ fontSize: 18, color: C.muted }}>⋮</div>
      </div>

      <div style={{ flex: 1, overflowY: "hidden", padding: "0 14px" }}>
        {/* Week calendar strip */}
        <div style={{ background: C.card, borderRadius: 16, padding: "12px 14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: C.muted }}>← Feb</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>March 2026</span>
            <span style={{ fontSize: 11, color: C.muted }}>Apr →</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {["M","T","W","T","F","S","S"].map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 10, color: C.muted }}>{d}</span>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: i < 3 ? C.primary : i === 3 ? C.pLight : "transparent", border: `1.5px solid ${i <= 3 ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i < 3 && <span style={{ fontSize: 12, color: "white" }}>✓</span>}
                  {i === 3 && <span style={{ fontSize: 9, fontWeight: 700, color: C.primary }}>30</span>}
                  {i > 3 && <span style={{ fontSize: 9, color: C.muted }}>{24+i}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress overview */}
        <div style={{ background: `linear-gradient(135deg, #7c3aed11, #7c3aed06)`, borderRadius: 16, padding: "12px 14px", marginBottom: 12, border: "1.5px solid #7c3aed22" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Today's Progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>2/5 tasks</span>
          </div>
          <div style={{ height: 8, background: "rgba(124,58,237,0.12)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "40%", height: "100%", background: "#7c3aed", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 11, color: C.muted }}>🔥 12 day streak</span>
            <span style={{ fontSize: 11, color: C.muted }}>⚡ +55 XP earned</span>
          </div>
        </div>

        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 4, height: 14, borderRadius: 2, background: "#7c3aed" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Today's Tasks — Mon, Mar 30</span>
        </div>

        {/* Task list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map((t, i) => (
            <div key={i} style={{ background: t.done ? "#f5f0ff" : C.card, borderRadius: 14, padding: "12px 14px", border: `1.5px solid ${t.done ? "#7c3aed33" : C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: t.done ? "#7c3aed" : "transparent", border: `2px solid ${t.done ? "#7c3aed" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.done && <span style={{ fontSize: 12, color: "white" }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: t.done ? C.muted : C.text, fontWeight: 500, textDecoration: t.done ? "line-through" : "none" }}>{t.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.time} · ⚡ +{t.xp} XP</div>
              </div>
              {!t.done && <span style={{ fontSize: 12, color: C.muted }}>▶</span>}
            </div>
          ))}
        </div>

        {/* Start session button */}
        <div style={{ background: "#7c3aed", borderRadius: 16, padding: "14px", marginTop: 12, textAlign: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "white" }}>✨ Start Guided Session</span>
        </div>
      </div>
      <Nav active={1} />
    </div>
  );
}
