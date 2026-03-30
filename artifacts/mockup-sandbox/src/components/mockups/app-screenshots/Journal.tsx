
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

export default function Journal() {
  const pastEntries = [
    { date: "Sun, Mar 29", mood: "great", preview: "Fantastic meditation session today. Feeling centred and focused..." },
    { date: "Sat, Mar 28", mood: "good", preview: "Missed my run but did a longer meditation instead. Balance..." },
    { date: "Fri, Mar 27", mood: "okay", preview: "Tough day at work but managed to complete all habit tasks..." },
  ];

  const moodColors: Record<string, string> = { great: "#10b981", good: "#22c55e", okay: "#f59e0b", bad: "#f97316", terrible: "#ef4444" };

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
        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: C.text }}>Daily Journal</div>
        <div style={{ marginLeft: "auto", background: "#dbeafe", border: "1px solid #93c5fd", borderRadius: 12, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>Pro+</div>
      </div>

      <div style={{ flex: 1, overflowY: "hidden", padding: "12px 14px" }}>
        {/* Date navigator */}
        <div style={{ background: C.card, borderRadius: 14, padding: "10px 16px", marginBottom: 12, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 20, color: C.muted }}>‹</span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Monday, March 30</div>
            <div style={{ fontSize: 11, color: C.muted }}>Today</div>
          </div>
          <span style={{ fontSize: 20, color: C.border }}>›</span>
        </div>

        {/* Mood picker */}
        <div style={{ background: C.card, borderRadius: 16, padding: "14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.08em" }}>How are you feeling today?</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["😄","Great"],["😊","Good"],["😐","Okay"],["😔","Bad"],["😢","Terrible"]].map(([emoji, label], i) => (
              <div key={label} style={{ flex: 1, padding: "8px 4px", borderRadius: 12, background: i === 0 ? "#d1fae5" : C.bg, border: `1.5px solid ${i === 0 ? "#10b981" : C.border}`, textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 20 }}>{emoji}</div>
                <div style={{ fontSize: 10, color: i === 0 ? "#047857" : C.muted, fontWeight: i === 0 ? 700 : 400, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Text area */}
        <div style={{ background: C.card, borderRadius: 16, padding: "14px", marginBottom: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Today's reflection</div>
          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: C.bg, borderRadius: 12, padding: "12px", border: `1px solid ${C.border}`, minHeight: 80 }}>
            Today's meditation was wonderful. I noticed how much calmer I feel after just 20 minutes of breathing exercises. The gratitude practice is really shifting my mindset...
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <div style={{ background: C.pLight, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: C.primary, fontWeight: 600 }}>#mindfulness</div>
            <div style={{ background: C.pLight, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: C.primary, fontWeight: 600 }}>#growth</div>
            <div style={{ background: C.pLight, border: `1px solid ${C.border}`, borderRadius: 20, padding: "5px 12px", fontSize: 12, color: C.muted }}>+ tag</div>
          </div>
        </div>

        {/* AI Insights button */}
        <div style={{ background: `linear-gradient(135deg, ${C.primary}, #15a05a)`, borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "white" }}>✨ Get AI Insights</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>Analyse your mood & habit patterns</div>
          </div>
          <span style={{ fontSize: 18, color: "white" }}>→</span>
        </div>

        {/* Past entries */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 4, height: 14, borderRadius: 2, background: C.primary }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Past Entries</span>
        </div>
        {pastEntries.map((e, i) => (
          <div key={i} style={{ background: C.card, borderRadius: 14, padding: "12px 14px", marginBottom: 8, border: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ fontSize: 20 }}>{["😄","😊","😐"][i]}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{e.date}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: Object.values(moodColors)[i] }}>{e.mood}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2, lineHeight: 1.4 }}>{e.preview}</div>
            </div>
          </div>
        ))}
      </div>
      <Nav active={2} />
    </div>
  );
}
