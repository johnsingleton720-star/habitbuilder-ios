/**
 * One-time script to generate voice narration audio for the feature tour.
 * Uses the Replit AI Integrations OpenAI proxy, which supports gpt-audio
 * (the /audio/speech endpoint is not available through the proxy).
 * Run: npx tsx scripts/generate-tour-audio.ts
 * Output: client/public/tour-audio/step-{1..17}.mp3
 */
import OpenAI from "openai";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface GptAudioRequestBody {
  model: string;
  modalities: string[];
  audio: { voice: string; format: string };
  messages: Array<{ role: string; content: string }>;
}

interface GptAudioMessageContent {
  audio?: { data: string };
}

interface GptAudioChoice {
  message: GptAudioMessageContent;
}

interface GptAudioResponse {
  choices: GptAudioChoice[];
}

const narrations: string[] = [
  // Step 1: Your Progress at a Glance
  "Welcome to Habit Builder! This card at the top is your personal scoreboard. It shows your level, XP points, and current streak — all the momentum you're building day by day.",

  // Step 2: Your Daily Action Center
  "This is your home base every single day. Your most important habits and tasks show up right here, so you always know exactly where to start — no guesswork, no overwhelm.",

  // Step 3: Your Habits
  "This is where your habits live. Tap any one to dive into your personalized AI action plan, start a guided session, and watch your streaks grow. Tap the plus to add a new habit anytime.",

  // Step 4: Earn Rewards
  "You'll earn badges and XP as you hit milestones — streak goals, completion targets, and more. Every small win adds up. This is how consistency becomes something you can actually see and feel.",

  // Step 5: Powerful Tools
  "These are your coaching tools — a Focus Timer for deep work, Mood Check-in to track how you feel day to day, Goals to set bigger targets, and a Smart Planner that organizes everything for you.",

  // Step 6: More Features
  "Tap your profile picture to open even more. You'll find AI Coach Chat, your daily journal, analytics, and — if you have a premium plan — the community forum and accountability partners.",

  // Step 7: Track Your Progress (mobile)
  "The Progress tab shows your habit streaks, completion trends, and stats over time. Your consistency tells a story — this is where you read it.",

  // Step 8: Navigate the App (mobile)
  "Use this bar at the bottom to move through the app quickly. Dashboard, Habits, Progress, and Account — everything is one tap away.",

  // Step 9: Guided Sessions
  "One of the most powerful things here: guided sessions. Open any habit, tap Start Session, and the AI walks you through each task one at a time — like having a personal coach right beside you.",

  // Step 10: AI Coach Chat
  "Tap your profile picture to open Coach Chat. You can ask the AI anything — why a habit matters, how to stay motivated, or what to do when life gets in the way. It's there whenever you need it.",

  // Step 11: Daily Journal
  "There's a private journal built right in. Write a few lines each day — your reflections help the AI understand you better and give you more relevant coaching over time.",

  // Step 12: Mood Check-in
  "Log your mood and energy levels here. The AI uses this to spot patterns and fine-tune your plan so your habits work with your real life, not against it.",

  // Step 13: Focus Timer
  "Need to concentrate? The Focus Timer helps you work in timed, focused sessions — perfect for habit tasks like studying, writing, or creative work.",

  // Step 14: Goals & Milestones
  "Set bigger goals that your daily habits build toward — like running a 5K, reading 12 books this year, or meditating 100 days in a row. Goals give your habits a deeper purpose.",

  // Step 15: Daily Planner
  "The AI Planner looks at all your habits and your schedule, then builds you an optimized daily plan — so you always know what to focus on and when.",

  // Step 16: About Me — AI Profile
  "One last tip: head to Account and find the About Me section. Fill it in once — your schedule, energy levels, what's worked before — and the AI will tailor everything to fit your real life.",

  // Step 17: You're All Set
  "And that's the tour! You're all set to start building. For a full feature guide, find App Guide in your Account settings. Everything you share here is completely private — it's just here to make your coaching better. Good luck!",
];

async function generateAudio(text: string, stepNum: number): Promise<void> {
  console.log(`Generating step ${stepNum}/${narrations.length}: "${text.slice(0, 60)}..."`);

  const requestBody: GptAudioRequestBody = {
    model: "gpt-audio",
    modalities: ["text", "audio"],
    audio: { voice: "nova", format: "mp3" },
    messages: [
      {
        role: "system",
        content: "You are a warm, welcoming app guide with a calm and encouraging voice. Speak the text naturally and clearly, exactly as written.",
      },
      { role: "user", content: text },
    ],
  };

  const rawResponse = await (openai.chat.completions.create as (body: GptAudioRequestBody) => Promise<GptAudioResponse>)(requestBody);

  const audioData = rawResponse.choices[0]?.message?.audio?.data;
  if (!audioData) {
    throw new Error(`No audio data returned for step ${stepNum}`);
  }

  const buffer = Buffer.from(audioData, "base64");
  const outputPath = join("client", "public", "tour-audio", `step-${stepNum}.mp3`);
  writeFileSync(outputPath, buffer);
  console.log(`  ✓ Saved step-${stepNum}.mp3 (${Math.round(buffer.length / 1024)}KB)`);
}

async function main(): Promise<void> {
  mkdirSync(join("client", "public", "tour-audio"), { recursive: true });
  console.log(`Generating ${narrations.length} tour audio clips (nova voice, mp3)...\n`);

  for (let i = 0; i < narrations.length; i++) {
    await generateAudio(narrations[i], i + 1);
    if (i < narrations.length - 1) {
      await new Promise<void>(r => setTimeout(r, 300));
    }
  }

  console.log(`\nDone! All ${narrations.length} clips saved to client/public/tour-audio/`);
}

main().catch((err: Error) => {
  console.error("Error:", err.message);
  process.exit(1);
});
