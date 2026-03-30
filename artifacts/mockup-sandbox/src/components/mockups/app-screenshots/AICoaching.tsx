
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

const messages = [
  { role: "ai", text: "Hi Sarah! 👋 I've looked at your habit data. Your meditation streak is impressive — 12 days! How are you feeling about your morning routine?", time: "9:32 AM" },
  { role: "user", text: "It's been great! I feel much calmer in the mornings. But I'm struggling to stay consistent with running.", time: "9:34 AM" },
  { role: "ai", text: "That's wonderful progress on meditation! For running, let's look at your schedule. Your data shows you skip most on Mondays and Fridays. Would a shorter 15-min run on those days help build consistency?", time: "9:34 AM" },
  { role: "user", text: "Yes! That makes so much sense. Can you update my plan?", time: "9:36 AM" },
];

export default function AICoaching() {
  return (
    <div style={{ width: 390, height: 844, background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>9:41</span>
        <span style={{ fontSize: 12, color: C.text }}>5G 🔋</span>
      </div>

      {/* Header */}
      <div style={{ padding: "0 16px 12px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 18, color: C.muted }}>←</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: C.text }}>Coach Chat</div>
        </div>
        <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: "#92400e" }}>✨ Premium</div>
      </div>

      {/* Usage bar */}
      <div style={{ padding: "8px 16px", background: C.pLight, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: C.muted }}>Monthly messages: 3 of 20 used</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: C.primary }}>17 left</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
          <div style={{ width: "15%", height: "100%", background: C.primary, borderRadius: 2 }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "hidden", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", background: msg.role === "user" ? C.primary : C.card, borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "10px 14px", border: msg.role === "ai" ? `1px solid ${C.border}` : "none", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {msg.role === "ai" && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
                  <span style={{ fontSize: 11 }}>✨</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.primary }}>Coach</span>
                </div>
              )}
              <p style={{ fontSize: 13, color: msg.role === "user" ? "white" : C.text, lineHeight: 1.5, margin: 0 }}>{msg.text}</p>
              <p style={{ fontSize: 10, color: msg.role === "user" ? "rgba(255,255,255,0.65)" : C.muted, marginTop: 4, margin: 0 }}>{msg.time}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: "18px 18px 18px 4px", padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: C.muted, opacity: 0.5 + i * 0.25 }} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: "8px 14px 90px", background: C.card, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 24, padding: "10px 14px" }}>
          <span style={{ flex: 1, fontSize: 14, color: C.muted }}>Reply to your coach...</span>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "white" }}>↑</div>
        </div>
      </div>

      <Nav active={2} />
    </div>
  );
}
