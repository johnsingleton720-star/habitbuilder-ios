import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Star, Leaf, Compass, Trophy, Sparkles, Droplets, Moon, Coffee,
  Footprints, Brain, BookOpen, Dumbbell, Bed, Sun, GlassWater, Salad,
  Apple, Pencil, Music, Palette, Camera, Wind, Waves, Bike, Mountain,
  TreePine, Flower2, Pill, Home, Users, PiggyBank, Languages, Code,
  Laptop, Gamepad2, Target, Heart, Smile, Timer, Zap, Check
} from "lucide-react";

const ICON_OPTIONS = [
  { name: "Star", icon: Star },
  { name: "Target", icon: Target },
  { name: "Heart", icon: Heart },
  { name: "Trophy", icon: Trophy },
  { name: "Sparkles", icon: Sparkles },
  { name: "Zap", icon: Zap },
  { name: "Brain", icon: Brain },
  { name: "BookOpen", icon: BookOpen },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Footprints", icon: Footprints },
  { name: "GlassWater", icon: GlassWater },
  { name: "Salad", icon: Salad },
  { name: "Apple", icon: Apple },
  { name: "Coffee", icon: Coffee },
  { name: "Moon", icon: Moon },
  { name: "Sun", icon: Sun },
  { name: "Bed", icon: Bed },
  { name: "Pencil", icon: Pencil },
  { name: "Music", icon: Music },
  { name: "Palette", icon: Palette },
  { name: "Camera", icon: Camera },
  { name: "Wind", icon: Wind },
  { name: "Waves", icon: Waves },
  { name: "Bike", icon: Bike },
  { name: "Mountain", icon: Mountain },
  { name: "TreePine", icon: TreePine },
  { name: "Flower2", icon: Flower2 },
  { name: "Leaf", icon: Leaf },
  { name: "Droplets", icon: Droplets },
  { name: "Pill", icon: Pill },
  { name: "Home", icon: Home },
  { name: "Users", icon: Users },
  { name: "PiggyBank", icon: PiggyBank },
  { name: "Languages", icon: Languages },
  { name: "Code", icon: Code },
  { name: "Laptop", icon: Laptop },
  { name: "Gamepad2", icon: Gamepad2 },
  { name: "Smile", icon: Smile },
  { name: "Timer", icon: Timer },
  { name: "Compass", icon: Compass },
];

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
  const [iconOpen, setIconOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const SelectedIconComponent = ICON_OPTIONS.find(i => i.name === selectedIcon)?.icon || Star;

  return (
    <div className="flex gap-2">
      <Popover open={iconOpen} onOpenChange={setIconOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            className="w-14 h-14 p-0"
            data-testid="button-select-icon"
          >
            <SelectedIconComponent className="w-6 h-6" style={{ color: selectedColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <p className="text-sm font-medium mb-2 px-1">Choose Icon</p>
          <ScrollArea className="h-48">
            <div className="grid grid-cols-6 gap-1">
              {ICON_OPTIONS.map((option) => (
                <Button
                  key={option.name}
                  type="button"
                  variant={selectedIcon === option.name ? "default" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    onIconChange(option.name);
                    setIconOpen(false);
                  }}
                  data-testid={`icon-option-${option.name}`}
                >
                  <option.icon className="w-4 h-4" />
                </Button>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Popover open={colorOpen} onOpenChange={setColorOpen}>
        <PopoverTrigger asChild>
          <Button 
            type="button" 
            variant="outline" 
            className="w-14 h-14 p-0"
            data-testid="button-select-color"
          >
            <div 
              className="w-6 h-6 rounded-full" 
              style={{ backgroundColor: selectedColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          <p className="text-sm font-medium mb-2 px-1">Choose Color</p>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.name}
                type="button"
                className={cn(
                  "w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                  color.class
                )}
                onClick={() => {
                  onColorChange(color.value);
                  setColorOpen(false);
                }}
                title={color.name}
                data-testid={`color-option-${color.name}`}
              >
                {selectedColor === color.value && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { ICON_OPTIONS, COLOR_OPTIONS };
