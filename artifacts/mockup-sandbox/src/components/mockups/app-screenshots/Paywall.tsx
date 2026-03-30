
import { Check, ArrowLeft, Star } from "lucide-react";

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

const features = [
  { emoji: "🤖", title: "Unlimited AI Habit Plans", desc: "Personalized plans tailored to your life" },
  { emoji: "📊", title: "Advanced Analytics", desc: "Deep insights into your habit patterns" },
  { emoji: "💬", title: "AI Coach — Always On", desc: "Two-way coaching conversations daily" },
  { emoji: "🏆", title: "Achievements & XP", desc: "Full gamification with XP multipliers" },
  { emoji: "📔", title: "Unlimited Journal", desc: "AI summaries & mood tracking" },
  { emoji: "🎯", title: "Goals Tracking", desc: "Long-term goals with milestone alerts" },
];

export function Paywall() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>

        <div className="flex justify-start mb-4">
          <ArrowLeft size={20} style={{ color: MUTED }} />
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ width: 70, height: 70, borderRadius: 22, background: "#fffbeb", border: "2px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 32 }}>
            👑
          </div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 23, color: TEXT, lineHeight: 1.25, marginBottom: 6 }}>
            Start Your Free<br />7-Day Premium Trial
          </div>
          <div style={{ fontSize: 14, color: MUTED }}>No credit card required to start</div>
        </div>

        {/* Features */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < features.length - 1 ? 12 : 0, marginBottom: i < features.length - 1 ? 12 : 0, borderBottom: i < features.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: PRIMARYLIGHT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.emoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{f.title}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{f.desc}</div>
              </div>
              <Check size={16} style={{ color: PRIMARY, marginTop: 8, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ background: PRIMARYLIGHT, border: `1px solid ${PRIMARY}30`, borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>7 days free, then only</div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 30, color: TEXT }}>$6.99<span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>/month</span></div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Cancel anytime · Billed monthly</div>
        </div>

        {/* CTA */}
        <div style={{ background: PRIMARY, borderRadius: 16, padding: "16px", textAlign: "center", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 17, color: "white", marginBottom: 14, boxShadow: `0 4px 20px ${PRIMARY}40` }}>
          Start Free Trial →
        </div>

        {/* Social proof */}
        <div style={{ textAlign: "center" }}>
          <div className="flex justify-center items-center gap-1 mb-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#f59e0b" stroke="none" />)}
            <span style={{ fontSize: 13, color: TEXT, fontWeight: 600, marginLeft: 4 }}>4.8</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>Loved by 2,400+ users worldwide</div>
        </div>
      </div>
    </div>
  );
}
