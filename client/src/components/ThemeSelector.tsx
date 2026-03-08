import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Palette, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    card: string;
    muted: string;
  };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: "nature",
    name: "Nature",
    description: "Calming teals and greens",
    isPremium: false,
    colors: {
      primary: "166 76% 45%",
      primaryForeground: "0 0% 100%",
      accent: "165 60% 45%",
      accentForeground: "0 0% 100%",
      background: "160 30% 98%",
      card: "160 30% 100%",
      muted: "160 20% 94%",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep blues and aquas",
    isPremium: true,
    colors: {
      primary: "210 100% 50%",
      primaryForeground: "0 0% 100%",
      accent: "195 90% 50%",
      accentForeground: "0 0% 100%",
      background: "210 30% 98%",
      card: "210 30% 100%",
      muted: "210 20% 94%",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm oranges and pinks",
    isPremium: true,
    colors: {
      primary: "20 90% 55%",
      primaryForeground: "0 0% 100%",
      accent: "350 80% 60%",
      accentForeground: "0 0% 100%",
      background: "30 40% 98%",
      card: "30 40% 100%",
      muted: "30 30% 94%",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft purples and violets",
    isPremium: true,
    colors: {
      primary: "270 60% 55%",
      primaryForeground: "0 0% 100%",
      accent: "290 50% 60%",
      accentForeground: "0 0% 100%",
      background: "270 30% 98%",
      card: "270 30% 100%",
      muted: "270 20% 94%",
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Earthy greens and browns",
    isPremium: true,
    colors: {
      primary: "140 50% 40%",
      primaryForeground: "0 0% 100%",
      accent: "30 40% 45%",
      accentForeground: "0 0% 100%",
      background: "100 20% 98%",
      card: "100 20% 100%",
      muted: "100 15% 94%",
    },
  },
  {
    id: "ruby",
    name: "Ruby",
    description: "Bold reds and crimsons",
    isPremium: true,
    colors: {
      primary: "350 75% 50%",
      primaryForeground: "0 0% 100%",
      accent: "340 70% 55%",
      accentForeground: "0 0% 100%",
      background: "350 25% 98%",
      card: "350 25% 100%",
      muted: "350 15% 94%",
    },
  },
  {
    id: "amber",
    name: "Amber",
    description: "Warm golden tones",
    isPremium: true,
    colors: {
      primary: "40 90% 50%",
      primaryForeground: "0 0% 100%",
      accent: "35 85% 55%",
      accentForeground: "0 0% 100%",
      background: "40 30% 98%",
      card: "40 30% 100%",
      muted: "40 20% 94%",
    },
  },
  {
    id: "cyan",
    name: "Cyan",
    description: "Electric aqua vibes",
    isPremium: true,
    colors: {
      primary: "185 80% 45%",
      primaryForeground: "0 0% 100%",
      accent: "180 75% 50%",
      accentForeground: "0 0% 100%",
      background: "185 25% 98%",
      card: "185 25% 100%",
      muted: "185 15% 94%",
    },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Elegant pinks",
    isPremium: true,
    colors: {
      primary: "330 70% 55%",
      primaryForeground: "0 0% 100%",
      accent: "340 65% 60%",
      accentForeground: "0 0% 100%",
      background: "330 25% 98%",
      card: "330 25% 100%",
      muted: "330 15% 94%",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    description: "Rich elite greens",
    isPremium: true,
    colors: {
      primary: "155 75% 40%",
      primaryForeground: "0 0% 100%",
      accent: "150 70% 45%",
      accentForeground: "0 0% 100%",
      background: "155 25% 98%",
      card: "155 25% 100%",
      muted: "155 15% 94%",
    },
  },
  {
    id: "platinum",
    name: "Platinum",
    description: "Sleek silver tones",
    isPremium: true,
    colors: {
      primary: "220 15% 55%",
      primaryForeground: "0 0% 100%",
      accent: "215 20% 60%",
      accentForeground: "0 0% 100%",
      background: "220 10% 98%",
      card: "220 10% 100%",
      muted: "220 8% 94%",
    },
  },
  {
    id: "champion_gold",
    name: "Champion Gold",
    description: "Ultimate golden glory",
    isPremium: true,
    colors: {
      primary: "45 95% 50%",
      primaryForeground: "0 0% 15%",
      accent: "40 90% 55%",
      accentForeground: "0 0% 15%",
      background: "45 30% 98%",
      card: "45 30% 100%",
      muted: "45 20% 94%",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Clean blacks and whites",
    isPremium: false,
    colors: {
      primary: "0 0% 15%",
      primaryForeground: "0 0% 100%",
      accent: "0 0% 30%",
      accentForeground: "0 0% 100%",
      background: "0 0% 99%",
      card: "0 0% 100%",
      muted: "0 0% 96%",
    },
  },
];

// Apply theme to document by setting CSS variables
// Only applies primary/accent colors - background colors are controlled by light/dark mode
export function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;
  // Only set primary and accent colors from theme
  // Background, card, muted colors are handled by light/dark mode CSS
  const colorKeysToApply = ['primary', 'primaryForeground', 'accent', 'accentForeground'];
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    if (colorKeysToApply.includes(key)) {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    }
  });
}

export function useAppTheme() {
  const { user } = useAuth();
  const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;
  
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    const savedTheme = localStorage.getItem("appColorTheme") || "nature";
    return savedTheme;
  });

  // Sync with server theme when user data loads
  useEffect(() => {
    if (!user) return;
    if (user.colorTheme) {
      const serverTheme = APP_THEMES.find(t => t.id === user.colorTheme);
      if (serverTheme) {
        if (!serverTheme.isPremium || isPremium) {
          setCurrentTheme(user.colorTheme);
          localStorage.setItem("appColorTheme", user.colorTheme);
          applyThemeToDocument(serverTheme);
        } else if (user.subscriptionTier) {
          setCurrentTheme("nature");
          localStorage.setItem("appColorTheme", "nature");
          applyThemeToDocument(APP_THEMES.find(t => t.id === "nature")!);
        }
      }
    }
  }, [user?.colorTheme, user?.subscriptionTier, isPremium]);

  // Apply theme when currentTheme changes
  useEffect(() => {
    const theme = APP_THEMES.find(t => t.id === currentTheme);
    if (theme) {
      if (theme.isPremium && !isPremium && user?.subscriptionTier) {
        const defaultTheme = APP_THEMES.find(t => t.id === "nature")!;
        applyThemeToDocument(defaultTheme);
        setCurrentTheme("nature");
        localStorage.setItem("appColorTheme", "nature");
      } else {
        applyThemeToDocument(theme);
        localStorage.setItem("appColorTheme", theme.id);
      }
    }
  }, [currentTheme, isPremium, user?.subscriptionTier]);

  const setTheme = (themeId: string) => {
    const theme = APP_THEMES.find(t => t.id === themeId);
    if (theme && (theme.isPremium && !isPremium)) {
      return;
    }
    setCurrentTheme(themeId);
  };

  return { currentTheme, setTheme, themes: APP_THEMES };
}

interface ThemeSelectorProps {
  onThemeChange?: (themeId: string) => void;
}

export function ThemeSelector({ onThemeChange }: ThemeSelectorProps) {
  const { user } = useAuth();
  const { currentTheme, setTheme } = useAppTheme();
  const { toast } = useToast();
  
  const isPremium = user?.subscriptionTier === 'premium' || user?.isAdmin;

  const [previousTheme, setPreviousTheme] = useState<string>(currentTheme);

  const saveThemeMutation = useMutation({
    mutationFn: async (themeId: string) => {
      return await apiRequest("PATCH", "/api/user/color-theme", { colorTheme: themeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      setTheme(previousTheme);
      toast({
        title: "Failed to save theme",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleThemeSelect = (theme: AppTheme) => {
    if (theme.isPremium && !isPremium) {
      return;
    }
    setPreviousTheme(currentTheme);
    setTheme(theme.id);
    saveThemeMutation.mutate(theme.id);
    onThemeChange?.(theme.id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Palette className="w-5 h-5 text-primary" />
          Color Theme
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {APP_THEMES.map((theme) => {
            const isLocked = theme.isPremium && !isPremium;
            const isSelected = currentTheme === theme.id;
            
            return (
              <button
                key={theme.id}
                onClick={() => handleThemeSelect(theme)}
                disabled={isLocked}
                className={cn(
                  "relative p-3 rounded-lg border-2 transition-all text-left",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent bg-muted/30 hover:bg-muted/50",
                  isLocked && "opacity-60 cursor-not-allowed"
                )}
                data-testid={`theme-${theme.id}`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
                {isLocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex gap-1 mb-2">
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: `hsl(${theme.colors.primary})` }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: `hsl(${theme.colors.accent})` }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full border" 
                    style={{ backgroundColor: `hsl(${theme.colors.background})` }}
                  />
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm">{theme.name}</span>
                  {theme.isPremium && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      Premium
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </button>
            );
          })}
        </div>
        
        {!isPremium && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Upgrade to Premium to unlock all color themes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
