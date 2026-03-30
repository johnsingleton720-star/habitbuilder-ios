
import { Home, Leaf, Wrench, BarChart3, Settings, ArrowLeft, Mic, Send, Sparkles } from "lucide-react";

const BG = "#eef4f1";
const CARD = "#ffffff";
const PRIMARY = "#1a7a50";
const TEXT = "#0d2318";
const MUTED = "#56736a";
const BORDER = "#c5dbd2";
const PRIMARYLIGHT = "#e8f5ef";

function StatusBar() {
  return (
    <div style={{ background: CARD, color: TEXT }} className="flex justify-between items-center px-5 pt-3 pb-1">
      <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: 15 }}>9:41</span>
      <div style={{ width: 18, height: 10, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px", display: "flex", alignItems: "center" }}>
        <div style={{ width: "70%", height: "100%", background: TEXT, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function BottomNav() {
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
      {items.map(({ label, icon: Icon, id }) => (
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "habits" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "habits" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "habits" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const messages = [
  { role: "ai", text: "Amazing work hitting day 47! 🎉 Your morning routine is now fully automatic. Completion rate this week: 94% — exceptional.", time: "9:32 AM" },
  { role: "ai", text: "Today, let's push your evening run to 30 minutes. Based on your patterns, Monday 6–7pm is your peak energy window.", time: "9:32 AM" },
  { role: "user", text: "I felt amazing today — energy levels way up. Meditation is genuinely helping my focus at work.", time: "9:35 AM" },
  { role: "ai", text: "That's the compound effect! 💪 When meditation and movement stack together, focus improves significantly. Don't change what's working. See you tomorrow!", time: "9:36 AM" },
];

export function AICoaching() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      {/* Header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "10px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <ArrowLeft size={20} style={{ color: MUTED }} />
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: PRIMARYLIGHT, border: `2px solid ${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={17} style={{ color: PRIMARY }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>AI Habit Coach</div>
          <div style={{ fontSize: 11, color: PRIMARY, fontWeight: 600 }}>● Online now</div>
        </div>
        <div style={{ background: PRIMARYLIGHT, borderRadius: 8, padding: "4px 10px", fontSize: 11, color: PRIMARY, fontWeight: 700 }}>Day 47 🔥</div>
      </div>

      {/* Habit context */}
      <div style={{ background: BG, padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 17 }}>🧘</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Morning Meditation</span>
        <span style={{ fontSize: 12, color: MUTED }}>· Daily Check-In</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div style={{ maxWidth: "82%" }}>
              {m.role === "ai" && (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                  <Sparkles size={11} style={{ color: PRIMARY }} />
                </div>
              )}
              <div style={{
                background: m.role === "ai" ? CARD : PRIMARY,
                border: m.role === "ai" ? `1px solid ${BORDER}` : "none",
                borderRadius: m.role === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                padding: "10px 13px",
                color: m.role === "ai" ? TEXT : "white",
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 16px", background: CARD, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "10px 16px", fontSize: 14, color: MUTED }}>
          Reply to your coach...
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mic size={17} style={{ color: PRIMARY }} />
        </div>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Send size={15} color="white" />
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
