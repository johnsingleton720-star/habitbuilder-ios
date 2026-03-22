import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const ICON_OPTIONS = [
  { name: "Star", emoji: "⭐" },
  { name: "Target", emoji: "🎯" },
  { name: "Heart", emoji: "❤️" },
  { name: "Trophy", emoji: "🏆" },
  { name: "Sparkles", emoji: "✨" },
  { name: "Zap", emoji: "⚡" },
  { name: "Brain", emoji: "🧠" },
  { name: "BookOpen", emoji: "📚" },
  { name: "Dumbbell", emoji: "💪" },
  { name: "Footprints", emoji: "👣" },
  { name: "GlassWater", emoji: "💧" },
  { name: "Salad", emoji: "🥗" },
  { name: "Apple", emoji: "🍎" },
  { name: "Coffee", emoji: "☕" },
  { name: "Moon", emoji: "🌙" },
  { name: "Sun", emoji: "☀️" },
  { name: "Bed", emoji: "🛏️" },
  { name: "Pencil", emoji: "✏️" },
  { name: "Music", emoji: "🎵" },
  { name: "Palette", emoji: "🎨" },
  { name: "Camera", emoji: "📷" },
  { name: "Wind", emoji: "🌬️" },
  { name: "Waves", emoji: "🌊" },
  { name: "Bike", emoji: "🚴" },
  { name: "Mountain", emoji: "⛰️" },
  { name: "TreePine", emoji: "🌲" },
  { name: "Flower2", emoji: "🌸" },
  { name: "Leaf", emoji: "🍃" },
  { name: "Droplets", emoji: "💦" },
  { name: "Pill", emoji: "💊" },
  { name: "Home", emoji: "🏠" },
  { name: "Users", emoji: "👥" },
  { name: "PiggyBank", emoji: "🐷" },
  { name: "Languages", emoji: "🌐" },
  { name: "Code", emoji: "💻" },
  { name: "Laptop", emoji: "🖥️" },
  { name: "Gamepad2", emoji: "🎮" },
  { name: "Smile", emoji: "😊" },
  { name: "Timer", emoji: "⏱️" },
  { name: "Compass", emoji: "🧭" },
  { name: "Flame", emoji: "🔥" },
  { name: "Meditation", emoji: "🧘" },
  { name: "Running", emoji: "🏃" },
  { name: "Cooking", emoji: "🍳" },
  { name: "Writing", emoji: "📝" },
  { name: "Yoga", emoji: "🧘‍♀️" },
  { name: "Swimming", emoji: "🏊" },
  { name: "Guitar", emoji: "🎸" },
  { name: "Prayer", emoji: "🙏" },
  { name: "Sleep", emoji: "😴" },
  { name: "Vitamins", emoji: "💉" },
  { name: "Walking", emoji: "🚶" },
  { name: "Stretching", emoji: "🤸" },
  { name: "Journaling", emoji: "📓" },
  { name: "Breathing", emoji: "🌬️" },
  { name: "Cleaning", emoji: "🧹" },
  { name: "Gardening", emoji: "🌱" },
  { name: "Dog", emoji: "🐕" },
  { name: "Cat", emoji: "🐈" },
  { name: "Baby", emoji: "👶" },
  { name: "Shopping", emoji: "🛒" },
  { name: "Study", emoji: "📖" },
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
        <ScrollArea className="h-48">
          <div className="grid grid-cols-7 gap-1">
            {ICON_OPTIONS.map((option) => (
              <Button
                key={option.name}
                type="button"
                variant={selectedIcon === option.name ? "default" : "ghost"}
                size="icon"
                className="h-9 w-9 text-lg"
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
