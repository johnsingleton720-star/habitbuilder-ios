
import { Home, Leaf, Wrench, BarChart3, Settings, ArrowLeft, Mic, Send, Sparkles } from "lucide-react";

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
        <div style={{ width: 22, height: 11, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px 1px", display: "flex", alignItems: "center" }}>
          <div style={{ width: "75%", height: "100%", background: TEXT, borderRadius: 1 }} />
        </div>
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
    <div style={{ background: CARD, borderTop: `1px solid ${BORDER}` }} className="flex justify-around items-center pt-2 pb-5 px-2">
      {items.map(({ label, icon: Icon, id }) => (
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "habits" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "habits" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "habits" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const messages = [
  { role: "ai", text: "Amazing work hitting day 47! 🎉 Your morning routine is now fully automatic. Your completion rate this week is 94% — that's exceptional.", time: "9:32 AM" },
  { role: "ai", text: "Today, let's try pushing your evening run to 30 minutes. Based on your energy levels on Mondays, you tend to do best in the 6–7pm window.", time: "9:32 AM" },
  { role: "user", text: "I felt amazing today, energy levels are way up. The morning meditation is genuinely helping my focus at work.", time: "9:35 AM" },
  { role: "ai", text: "That's the compound effect kicking in 💪 When meditation and movement stack together, focus improves significantly. Keep this exact routine — don't change what's working. See you tomorrow!", time: "9:36 AM" },
];

export function AICoaching() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: "10px 16px 12px", background: CARD, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 12 }}>
        <ArrowLeft size={20} style={{ color: MUTED }} />
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${PRIMARY}40 0%, #60a5fa30 100%)`, border: `2px solid ${PRIMARY}50`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={16} style={{ color: PRIMARY }} />
            </div>
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>AI Habit Coach</div>
              <div style={{ fontSize: 11, color: PRIMARY }}>● Online now</div>
            </div>
          </div>
        </div>
        <div style={{ background: PRIMARY + "20", borderRadius: 8, padding: "4px 10px", fontSize: 11, color: PRIMARY, fontWeight: 600 }}>Day 47 🔥</div>
      </div>

      {/* Habit context banner */}
      <div style={{ background: "#0f2218", padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>🧘</span>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Morning Meditation</span>
          <span style={{ fontSize: 11, color: MUTED }}> · Daily Check-In</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }} className="flex flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div style={{ maxWidth: "82%" }}>
              {m.role === "ai" && (
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: PRIMARY + "25", border: `1px solid ${PRIMARY}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                  <Sparkles size={12} style={{ color: PRIMARY }} />
                </div>
              )}
              <div style={{
                background: m.role === "ai" ? CARD : PRIMARY,
                border: m.role === "ai" ? `1px solid ${BORDER}` : "none",
                borderRadius: m.role === "ai" ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                padding: "10px 13px",
                color: m.role === "ai" ? TEXT : "#0b1a13",
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                {m.text}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 16px", background: CARD, borderTop: `1px solid ${BORDER}`, display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, background: BG, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "10px 16px", fontSize: 14, color: MUTED }}>
          Reply to your coach...
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: PRIMARY + "20", border: `1px solid ${PRIMARY}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Mic size={18} style={{ color: PRIMARY }} />
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Send size={16} color="#0b1a13" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
