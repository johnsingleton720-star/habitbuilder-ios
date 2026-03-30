
import { Home, Leaf, Wrench, BarChart3, Settings, TrendingUp, Zap } from "lucide-react";

const BG = "#eef4f1";
const CARD = "#ffffff";
const PRIMARY = "#1a7a50";
const TEXT = "#0d2318";
const MUTED = "#56736a";
const BORDER = "#c5dbd2";
const SECONDARY = "#d4ece4";
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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "progress" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "progress" ? 2.2 : 1.8} />
          <span style={{ fontSize: 10, fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "progress" ? 600 : 400 }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const chartData = [38, 45, 52, 48, 62, 70, 65, 72, 78, 75, 82, 85, 80, 88, 86, 90, 87, 92, 89, 94, 91, 95, 92, 96, 93, 97, 94, 95, 96, 97];
const habits = [
  { emoji: "🧘", name: "Morning Meditation", pct: 97 },
  { emoji: "📚", name: "Read Daily", pct: 89 },
  { emoji: "🏃", name: "Evening Run", pct: 76 },
  { emoji: "❄️", name: "Cold Shower", pct: 64 },
  { emoji: "📔", name: "Journaling", pct: 82 },
];

export function Analytics() {
  const maxVal = Math.max(...chartData), minVal = Math.min(...chartData);
  const points = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 320;
    const y = 70 - ((v - minVal) / (maxVal - minVal)) * 60;
    return `${x},${y}`;
  });
  const areaPath = `M${points[0]} L${points.join(" L")} L320,70 L0,70 Z`;

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT, marginBottom: 2 }}>Analytics</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Last 30 days · All habits</div>

        {/* Stats row */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "Best Streak", value: "47", icon: "🔥" },
            { label: "Completed", value: "284", icon: "⚡" },
            { label: "Success Rate", value: "89%", icon: "🎯" },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 6px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 22, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 19, color: PRIMARY }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>Completion Trend</div>
              <div style={{ fontSize: 12, color: MUTED }}>30-day rolling average</div>
            </div>
            <div style={{ background: PRIMARYLIGHT, borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} style={{ color: PRIMARY }} />
              <span style={{ fontSize: 12, color: PRIMARY, fontWeight: 700 }}>+59% ↑</span>
            </div>
          </div>
          <div style={{ height: 80 }}>
            <svg width="100%" height="80" viewBox="0 0 320 70" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.01" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#grad)" />
              <polyline points={points.join(" ")} fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 10, color: MUTED }}>Day 1</span>
            <span style={{ fontSize: 10, color: MUTED }}>Day 30</span>
          </div>
        </div>

        {/* Habit breakdown */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 12 }}>Habit Performance</div>
          {habits.map((h, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>{h.emoji}</span>
                  <span style={{ fontSize: 13, color: TEXT }}>{h.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: PRIMARY }}>{h.pct}%</span>
              </div>
              <div style={{ height: 5, background: SECONDARY, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${h.pct}%`, background: PRIMARY, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div style={{ background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}25`, borderRadius: 16, padding: 14 }}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} style={{ color: PRIMARY }} />
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>AI Insight</span>
          </div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
            Your meditation habit has a <span style={{ color: PRIMARY, fontWeight: 600 }}>97% completion rate</span> — your strongest ever. Morning habits now anchor the rest of your day.
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
