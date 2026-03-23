import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const ICON_OPTIONS = [
  // Goals & achievement
  { name: "Star", emoji: "⭐" },
  { name: "Target", emoji: "🎯" },
  { name: "Trophy", emoji: "🏆" },
  { name: "Medal", emoji: "🥇" },
  { name: "Sparkles", emoji: "✨" },
  { name: "Flame", emoji: "🔥" },
  { name: "Zap", emoji: "⚡" },
  { name: "Rocket", emoji: "🚀" },
  { name: "Crown", emoji: "👑" },
  { name: "Diamond", emoji: "💎" },
  // Health & fitness
  { name: "Heart", emoji: "❤️" },
  { name: "Dumbbell", emoji: "💪" },
  { name: "Running", emoji: "🏃" },
  { name: "Footprints", emoji: "👣" },
  { name: "Walking", emoji: "🚶" },
  { name: "Yoga", emoji: "🧘‍♀️" },
  { name: "Meditation", emoji: "🧘" },
  { name: "Stretching", emoji: "🤸" },
  { name: "Swimming", emoji: "🏊" },
  { name: "Bike", emoji: "🚴" },
  { name: "Soccer", emoji: "⚽" },
  { name: "Basketball", emoji: "🏀" },
  { name: "Tennis", emoji: "🎾" },
  { name: "Boxing", emoji: "🥊" },
  { name: "Hiking", emoji: "🥾" },
  { name: "Skiing", emoji: "⛷️" },
  { name: "Surfing", emoji: "🏄" },
  // Food & nutrition
  { name: "Apple", emoji: "🍎" },
  { name: "Salad", emoji: "🥗" },
  { name: "GlassWater", emoji: "💧" },
  { name: "Droplets", emoji: "💦" },
  { name: "Coffee", emoji: "☕" },
  { name: "Tea", emoji: "🫖" },
  { name: "Avocado", emoji: "🥑" },
  { name: "Broccoli", emoji: "🥦" },
  { name: "Cooking", emoji: "🍳" },
  { name: "Smoothie", emoji: "🥤" },
  { name: "Grapes", emoji: "🍇" },
  // Mind & learning
  { name: "Brain", emoji: "🧠" },
  { name: "BookOpen", emoji: "📚" },
  { name: "Study", emoji: "📖" },
  { name: "Writing", emoji: "📝" },
  { name: "Pencil", emoji: "✏️" },
  { name: "Journaling", emoji: "📓" },
  { name: "Graduation", emoji: "🎓" },
  { name: "Microscope", emoji: "🔬" },
  { name: "Telescope", emoji: "🔭" },
  { name: "Compass", emoji: "🧭" },
  { name: "Map", emoji: "🗺️" },
  // Wellness & rest
  { name: "Moon", emoji: "🌙" },
  { name: "Sun", emoji: "☀️" },
  { name: "Bed", emoji: "🛏️" },
  { name: "Sleep", emoji: "😴" },
  { name: "Breathing", emoji: "🌬️" },
  { name: "Pill", emoji: "💊" },
  { name: "Stethoscope", emoji: "🩺" },
  { name: "Spa", emoji: "💆" },
  { name: "Bath", emoji: "🛁" },
  { name: "Smile", emoji: "😊" },
  // Arts & creativity
  { name: "Music", emoji: "🎵" },
  { name: "Guitar", emoji: "🎸" },
  { name: "Piano", emoji: "🎹" },
  { name: "Microphone", emoji: "🎤" },
  { name: "Palette", emoji: "🎨" },
  { name: "Camera", emoji: "📷" },
  { name: "Film", emoji: "🎬" },
  { name: "Theater", emoji: "🎭" },
  { name: "Dance", emoji: "💃" },
  { name: "Art", emoji: "🖼️" },
  // Work & productivity
  { name: "Laptop", emoji: "💻" },
  { name: "Code", emoji: "🖥️" },
  { name: "Briefcase", emoji: "💼" },
  { name: "Calendar", emoji: "📅" },
  { name: "Checklist", emoji: "✅" },
  { name: "Chart", emoji: "📊" },
  { name: "Timer", emoji: "⏱️" },
  { name: "Gamepad2", emoji: "🎮" },
  // Finance & money
  { name: "PiggyBank", emoji: "🐷" },
  { name: "Money", emoji: "💰" },
  { name: "Savings", emoji: "🏦" },
  { name: "Trending", emoji: "📈" },
  { name: "CreditCard", emoji: "💳" },
  // Nature & outdoors
  { name: "Waves", emoji: "🌊" },
  { name: "Mountain", emoji: "⛰️" },
  { name: "TreePine", emoji: "🌲" },
  { name: "Flower2", emoji: "🌸" },
  { name: "Leaf", emoji: "🍃" },
  { name: "Gardening", emoji: "🌱" },
  { name: "Sunflower", emoji: "🌻" },
  { name: "Camping", emoji: "⛺" },
  { name: "Wind", emoji: "💨" },
  { name: "Rainbow", emoji: "🌈" },
  // Social & relationships
  { name: "Users", emoji: "👥" },
  { name: "Prayer", emoji: "🙏" },
  { name: "Handshake", emoji: "🤝" },
  { name: "Letter", emoji: "💌" },
  { name: "Baby", emoji: "👶" },
  { name: "Family", emoji: "👨‍👩‍👧" },
  // Home & lifestyle
  { name: "Home", emoji: "🏠" },
  { name: "Cleaning", emoji: "🧹" },
  { name: "Shopping", emoji: "🛒" },
  { name: "Car", emoji: "🚗" },
  { name: "Travel", emoji: "✈️" },
  { name: "Luggage", emoji: "🧳" },
  // Animals & pets
  { name: "Dog", emoji: "🐕" },
  { name: "Cat", emoji: "🐈" },
  { name: "Bird", emoji: "🐦" },
  { name: "Fish", emoji: "🐠" },
  // Languages & global
  { name: "Languages", emoji: "🌐" },
  { name: "Brain2", emoji: "🤔" },
  { name: "Lightbulb", emoji: "💡" },
  { name: "Puzzle", emoji: "🧩" },
];

const EMOJI_MAP: Record<string, string> = {};
ICON_OPTIONS.forEach(opt => { EMOJI_MAP[opt.name] = opt.emoji; });

const COLOR_OPTIONS = [
  { name: "Teal", value: "#0d9488", class: "bg-teal-600" },
  { name: "Green", value: "#16a34a", class: "bg-green-600" },
  { name: "Blue", value: "#2563eb", class: "bg-blue-600" },
  { name: "Purple", value: "#9333ea", class: "bg-purple-600" },
  { name: "Pink", value: "#db2777", class: "bg-pink-600" },
  { name: "Red", value: "#dc2626", class: "bg-red-600" },
  { name: "Orange", value: "#ea580c", class: "bg-orange-600" },
  { name: "Amber", value: "#d97706", class: "bg-amber-600" },
  { name: "Lime", value: "#65a30d", class: "bg-lime-600" },
  { name: "Cyan", value: "#0891b2", class: "bg-cyan-600" },
  { name: "Indigo", value: "#4f46e5", class: "bg-indigo-600" },
  { name: "Rose", value: "#e11d48", class: "bg-rose-600" },
];

function getEmojiForIcon(iconName: string | undefined | null): string {
  if (!iconName) return "⭐";
  return EMOJI_MAP[iconName] || "⭐";
}

interface IconColorPickerProps {
  selectedIcon?: string;
  selectedColor?: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function IconColorPicker({ 
  selectedIcon = "Star", 
  selectedColor = "#0d9488",
  onIconChange, 
  onColorChange 
}: IconColorPickerProps) {
  const [activeTab, setActiveTab] = useState<"icon" | "color">("icon");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "icon"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("icon")}
          data-testid="tab-select-icon"
        >
          Icon
        </button>
        <button
          type="button"
          className={cn(
            "px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "color"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("color")}
          data-testid="tab-select-color"
        >
          Color
        </button>
      </div>

      {activeTab === "icon" && (
        <ScrollArea className="h-56">
          <div className="grid grid-cols-6 gap-1.5">
            {ICON_OPTIONS.map((option) => (
              <Button
                key={option.name}
                type="button"
                variant={selectedIcon === option.name ? "default" : "ghost"}
                size="icon"
                className="h-11 w-full text-2xl"
                onClick={() => onIconChange(option.name)}
                data-testid={`icon-option-${option.name}`}
              >
                {option.emoji}
              </Button>
            ))}
          </div>
        </ScrollArea>
      )}

      {activeTab === "color" && (
        <div className="grid grid-cols-6 gap-2 py-1">
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color.name}
              type="button"
              className={cn(
                "w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                color.class
              )}
              onClick={() => onColorChange(color.value)}
              title={color.name}
              data-testid={`color-option-${color.name}`}
            >
              {selectedColor === color.value && (
                <Check className="w-4 h-4 text-white" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { ICON_OPTIONS, COLOR_OPTIONS, EMOJI_MAP, getEmojiForIcon };
