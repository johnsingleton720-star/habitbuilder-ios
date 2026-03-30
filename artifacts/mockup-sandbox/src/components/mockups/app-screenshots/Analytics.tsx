
import { Home, Leaf, Wrench, BarChart3, Settings, TrendingUp, Flame, Zap, Target } from "lucide-react";

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
        <div key={id} className="flex flex-col items-center gap-0.5" style={{ color: id === "progress" ? PRIMARY : MUTED }}>
          <Icon size={22} strokeWidth={id === "progress" ? 2.2 : 1.8} />
          <span className="text-[10px]" style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: id === "progress" ? 600 : 400 }}>{label}</span>
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
  const maxVal = Math.max(...chartData);
  const minVal = Math.min(...chartData);
  const points = chartData.map((v, i) => {
    const x = (i / (chartData.length - 1)) * 320;
    const y = 80 - ((v - minVal) / (maxVal - minVal)) * 70;
    return `${x},${y}`;
  });
  const polyline = points.join(" ");
  const areaPath = `M${points[0]} L${points.join(" L")} L320,80 L0,80 Z`;

  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        {/* Header */}
        <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 22, color: TEXT, marginBottom: 4 }}>Analytics</div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>Last 30 days · All habits</div>

        {/* Stats row */}
        <div className="flex gap-3 mb-4">
          {[
            { label: "Best Streak", value: "47", icon: "🔥", color: "#f59e0b" },
            { label: "Completed", value: "284", icon: "⚡", color: PRIMARY },
            { label: "Success Rate", value: "89%", icon: "🎯", color: "#60a5fa" },
          ].map((s) => (
            <div key={s.label} style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "12px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 20, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: MUTED }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div className="flex justify-between items-center mb-3">
            <div>
              <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT }}>Completion Trend</div>
              <div style={{ fontSize: 12, color: MUTED }}>30-day rolling average</div>
            </div>
            <div style={{ background: PRIMARY + "20", borderRadius: 8, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}>
              <TrendingUp size={12} style={{ color: PRIMARY }} />
              <span style={{ fontSize: 12, color: PRIMARY, fontWeight: 600 }}>+59% ↑</span>
            </div>
          </div>
          <div style={{ position: "relative", height: 100 }}>
            <svg width="100%" height="100" viewBox="0 0 320 80" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.35" />
                  <stop offset="100%" stopColor={PRIMARY} stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#grad)" />
              <polyline points={polyline} fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex justify-between mt-1">
            <span style={{ fontSize: 10, color: MUTED }}>Day 1</span>
            <span style={{ fontSize: 10, color: MUTED }}>Day 30</span>
          </div>
        </div>

        {/* Habit breakdown */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 15, color: TEXT, marginBottom: 12 }}>Habit Performance</div>
          {habits.map((h, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 14 }}>{h.emoji}</span>
                  <span style={{ fontSize: 13, color: TEXT }}>{h.name}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: h.pct >= 85 ? PRIMARY : h.pct >= 70 ? "#60a5fa" : "#f59e0b" }}>{h.pct}%</span>
              </div>
              <div style={{ height: 5, background: BORDER, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${h.pct}%`, background: h.pct >= 85 ? PRIMARY : h.pct >= 70 ? "#60a5fa" : "#f59e0b", borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Insight */}
        <div style={{ background: "linear-gradient(135deg, #1a3828 0%, #152d20 100%)", border: `1px solid ${PRIMARY}30`, borderRadius: 16, padding: 14 }}>
          <div className="flex items-center gap-2 mb-2">
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: PRIMARY + "25", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={13} style={{ color: PRIMARY }} />
            </div>
            <span style={{ fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 14, color: TEXT }}>AI Insight</span>
          </div>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
            Your meditation habit has a <span style={{ color: PRIMARY, fontWeight: 600 }}>97% completion rate</span> — your strongest habit ever. Morning habits now form a solid anchor for the rest of your day.
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
