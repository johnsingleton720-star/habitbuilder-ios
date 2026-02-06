const BLOCKED_PATTERNS: RegExp[] = [
  /child\s*(sex|porn|abuse|exploit|molest|naked|nude)/i,
  /minor\s*(sex|porn|abuse|exploit|molest|naked|nude)/i,
  /kid\s*(sex|porn|abuse|exploit|molest|naked|nude)/i,
  /teen\s*(sex|porn|abuse|exploit|molest|naked|nude)/i,
  /underage\s*(sex|porn|abuse|exploit|molest|naked|nude)/i,
  /pedophil/i,
  /csam/i,
  /\bcp\b.*child/i,
  /child.*\bcp\b/i,
  /groom.*child/i,
  /groom.*minor/i,
  /groom.*kid/i,
  /child.*groom/i,

  /\b(kill|murder|assassinat|shoot|stab|poison)\b.*\b(people|person|someone|neighbor|family|wife|husband|boss|coworker|teacher|student)\b/i,
  /\b(people|person|someone|neighbor|family|wife|husband|boss|coworker|teacher|student)\b.*\b(kill|murder|assassinat|shoot|stab|poison)\b/i,
  /mass\s*(shoot|murder|kill|casualt)/i,
  /school\s*shoot/i,
  /domestic\s*terror/i,
  /bomb\s*mak/i,
  /make\s*bomb/i,
  /build\s*bomb/i,
  /how\s*to\s*(kill|murder)/i,
  /serial\s*kill/i,
  /genocide/i,
  /ethnic\s*cleans/i,

  /\b(cook|make|produce|manufactur|synth)\b.*(meth|cocaine|heroin|fentanyl|crack)/i,
  /\b(meth|cocaine|heroin|fentanyl|crack)\b.*(cook|make|produce|manufactur|synth|lab)/i,
  /drug\s*(deal|traffick|sell|distribut)/i,

  /self[\s-]*harm/i,
  /\bsuicid/i,
  /cut\s*myself/i,
  /starv.*myself/i,
  /anorexi.*goal/i,
  /purg.*habit/i,
  /bulimi.*habit/i,

  /stalk/i,
  /human\s*traffick/i,
  /sex\s*traffick/i,
  /rape/i,
  /\bforced\s*sex/i,
  /non[\s-]*consensual/i,

  /\b(hack|breach|crack)\b.*\b(system|network|account|password|server|bank)\b/i,
  /\b(steal|theft|rob|burglar|shoplift)\b/i,
  /identity\s*(theft|fraud)/i,
  /money\s*launder/i,
  /fraud\s*scheme/i,
  /counterfeit/i,
  /\bswat/i,
  /doxx/i,

  /white\s*supremac/i,
  /nazi/i,
  /\bn[\s_-]*word/i,
  /racial\s*(suprem|puri)/i,
  /ethnic\s*hate/i,
];

const FLAGGED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bporn/i, reason: "explicit_content" },
  { pattern: /\bxxx/i, reason: "explicit_content" },
  { pattern: /\bhentai/i, reason: "explicit_content" },
  { pattern: /\bonlyfans/i, reason: "explicit_content" },
  { pattern: /sex\s*work/i, reason: "explicit_content" },
  { pattern: /escort/i, reason: "explicit_content" },
  { pattern: /prostitut/i, reason: "explicit_content" },
  { pattern: /\bnude/i, reason: "explicit_content" },
  { pattern: /masturba/i, reason: "explicit_content" },

  { pattern: /\bweed\b/i, reason: "substance" },
  { pattern: /\bsmok.*more/i, reason: "substance" },
  { pattern: /\bdrink.*more\s*(alcohol|beer|wine|liquor|vodka|whiskey)/i, reason: "substance" },
  { pattern: /\bget\s*(drunk|high|wasted|stoned)/i, reason: "substance" },
  { pattern: /\bvap(e|ing)/i, reason: "substance" },

  { pattern: /\bgambl/i, reason: "gambling" },
  { pattern: /\bbet.*more/i, reason: "gambling" },
  { pattern: /\bcasino/i, reason: "gambling" },

  { pattern: /\bweapon/i, reason: "weapons" },
  { pattern: /\bgun\b/i, reason: "weapons" },
  { pattern: /\bfirearm/i, reason: "weapons" },
  { pattern: /\bexplosiv/i, reason: "weapons" },
];

export interface SafetyCheckResult {
  allowed: boolean;
  blocked: boolean;
  flagged: boolean;
  reason?: string;
  message?: string;
}

export function checkContentSafety(title: string, description?: string | null, goal?: string | null): SafetyCheckResult {
  const combinedText = [title, description, goal].filter(Boolean).join(" ");

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        allowed: false,
        blocked: true,
        flagged: false,
        reason: "blocked_content",
        message: "This habit contains content that violates our community guidelines. Habits involving harm to others, illegal activities, exploitation, or content involving minors are not permitted.",
      };
    }
  }

  for (const { pattern, reason } of FLAGGED_PATTERNS) {
    if (pattern.test(combinedText)) {
      if (reason === "explicit_content") {
        return {
          allowed: false,
          blocked: false,
          flagged: true,
          reason,
          message: "This habit contains explicit or adult content. While we support consenting adults, our platform focuses on building positive, healthy habits. Please rephrase your habit to focus on personal growth.",
        };
      }
      if (reason === "substance") {
        return {
          allowed: false,
          blocked: false,
          flagged: true,
          reason,
          message: "This habit appears to promote increased substance use. If you're looking to build healthier relationships with substances, try framing it positively (e.g., 'Reduce drinking' or 'Practice moderation').",
        };
      }
      if (reason === "gambling") {
        return {
          allowed: false,
          blocked: false,
          flagged: true,
          reason,
          message: "This habit appears to promote gambling. If you're looking to manage gambling habits, try framing it as 'Reduce gambling' or 'Practice financial discipline'.",
        };
      }
      if (reason === "weapons") {
        return {
          allowed: false,
          blocked: false,
          flagged: true,
          reason,
          message: "Habits related to weapons are not supported on this platform. If you're interested in a sport like archery or hunting safety, please describe it more specifically.",
        };
      }
      return {
        allowed: false,
        blocked: false,
        flagged: true,
        reason,
        message: "This habit has been flagged for review. Please rephrase it to focus on positive personal growth.",
      };
    }
  }

  return { allowed: true, blocked: false, flagged: false };
}
