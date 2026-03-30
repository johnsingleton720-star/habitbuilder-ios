
import { Home, Leaf, Wrench, BarChart3, Settings, Plus, Sparkles } from "lucide-react";

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
      <div style={{ width: 22, height: 11, border: `1.5px solid ${TEXT}`, borderRadius: 2, padding: "1px 1px", display: "flex", alignItems: "center" }}>
        <div style={{ width: "75%", height: "100%", background: TEXT, borderRadius: 1 }} />
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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "tools" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "tools" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "tools" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const moods = [
  { emoji: "😞", label: "Rough" },
  { emoji: "😐", label: "Okay" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😊", label: "Great" },
  { emoji: "🤩", label: "Amazing" },
];

const entries = [
  { date: "Today, Mar 30", mood: "🤩", tags: ["#mindfulness", "#focus", "#growth"], text: "Day 47 of my morning routine. Woke up at 5:30am feeling genuinely energized. The meditation is transforming my focus at work — ideas are clearer, stress is lower. The compound effect is real." },
  { date: "Yesterday, Mar 29", mood: "😊", tags: ["#productivity", "#discipline"], text: "Tough morning but I pushed through. Showed up for the run even when I didn't feel like it. That's what the habit is about — consistency over motivation." },
  { date: "Mar 28", mood: "😊", tags: ["#balance", "#mindfulness"], text: "Meditated for 15 minutes. Read 3 chapters. Small wins adding up." },
];

export function Journal() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT }}>Journal</div>
            <div style={{ fontSize: 13, color: MUTED }}>Monday, March 30</div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={20} color="#0b1a13" strokeWidth={2.5} />
          </div>
        </div>

        {/* Mood selector */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>How are you feeling today?</div>
          <div className="flex justify-between">
            {moods.map((m, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div style={{ width: 48, height: 48, borderRadius: 14, background: i === 4 ? PRIMARY + "25" : "transparent", border: i === 4 ? `2px solid ${PRIMARY}` : `2px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  {m.emoji}
                </div>
                <span style={{ fontSize: 9, color: i === 4 ? PRIMARY : MUTED, fontWeight: i === 4 ? 600 : 400 }}>{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's entry */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <div style={{ background: BG, borderRadius: 10, padding: 12, marginBottom: 10, minHeight: 80 }}>
            <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>Write about your day, your progress, what you're grateful for...</p>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex gap-2">
              {["#mindfulness", "#growth"].map(t => (
                <span key={t} style={{ background: PRIMARY + "15", color: PRIMARY, borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
            <div style={{ background: PRIMARY, borderRadius: 10, padding: "7px 16px", fontSize: 13, fontWeight: 700, color: "#0b1a13" }}>Save</div>
          </div>
        </div>

        {/* AI Summary */}
        <div style={{ background: "linear-gradient(135deg, #1a3828 0%, #152d20 100%)", border: `1px solid ${PRIMARY}30`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} style={{ color: PRIMARY }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>AI Weekly Summary</span>
          </div>
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.6 }}>Your journal reveals a strong mindfulness theme this week. Mood trending upward. Sleep and focus improving together.</p>
        </div>

        {/* Past entries */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 10 }}>Recent Entries</div>
        {entries.map((e, i) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontSize: 12, color: MUTED }}>{e.date}</span>
              <span style={{ fontSize: 20 }}>{e.mood}</span>
            </div>
            <p style={{ fontSize: 13, color: TEXT, lineHeight: 1.6, marginBottom: 8 }}>{e.text}</p>
            <div className="flex gap-2 flex-wrap">
              {e.tags.map(t => (
                <span key={t} style={{ background: PRIMARY + "15", color: PRIMARY, borderRadius: 6, padding: "2px 7px", fontSize: 10, fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
