
import { Check, Crown, Sparkles, Star, ArrowLeft } from "lucide-react";

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

const features = [
  { emoji: "🤖", title: "Unlimited AI Habit Plans", desc: "Personalized plans tailored to your life" },
  { emoji: "📊", title: "Advanced Analytics", desc: "Deep insights into your habit patterns" },
  { emoji: "💬", title: "AI Coach — Always On", desc: "Two-way coaching conversations daily" },
  { emoji: "🏆", title: "Achievements & XP", desc: "Full gamification with multipliers" },
  { emoji: "📔", title: "Unlimited Journal", desc: "AI-powered summaries & mood tracking" },
  { emoji: "🎯", title: "Goals Tracking", desc: "Long-term goals with milestone alerts" },
];

export function Paywall() {
  return (
    <div style={{ width: 390, height: 844, background: BG, fontFamily: "Plus Jakarta Sans, sans-serif", color: TEXT, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <StatusBar />
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>

        {/* Close */}
        <div className="flex justify-start mb-4">
          <ArrowLeft size={20} style={{ color: MUTED }} />
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #f59e0b30 0%, #f59e0b10 100%)", border: "2px solid #f59e0b50", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 34 }}>
            👑
          </div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 24, color: TEXT, lineHeight: 1.2, marginBottom: 6 }}>
            Start Your Free<br />7-Day Premium Trial
          </div>
          <div style={{ fontSize: 14, color: MUTED }}>No credit card required to start</div>
        </div>

        {/* Features */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 16, marginBottom: 16 }}>
          {features.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: i < features.length - 1 ? 12 : 0, marginBottom: i < features.length - 1 ? 12 : 0, borderBottom: i < features.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: PRIMARY + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{f.emoji}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{f.title}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{f.desc}</div>
              </div>
              <Check size={16} style={{ color: PRIMARY, marginLeft: "auto", marginTop: 8, flexShrink: 0 }} />
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={{ background: "linear-gradient(135deg, #1a3828 0%, #152d20 100%)", border: `1px solid ${PRIMARY}30`, borderRadius: 16, padding: 16, marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>Free for 7 days, then</div>
          <div style={{ fontFamily: "Outfit, sans-serif", fontWeight: 800, fontSize: 28, color: TEXT }}>$6.99<span style={{ fontSize: 16, fontWeight: 500, color: MUTED }}>/month</span></div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Cancel anytime · Billed monthly</div>
        </div>

        {/* CTA */}
        <div style={{ background: PRIMARY, borderRadius: 16, padding: "16px", textAlign: "center", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 17, color: "#0b1a13", marginBottom: 12, boxShadow: `0 4px 24px ${PRIMARY}40` }}>
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
