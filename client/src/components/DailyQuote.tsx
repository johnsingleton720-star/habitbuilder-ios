import { useDailyQuote } from "@/hooks/use-habits";
import { Quote, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DailyQuote() {
  const { data, isLoading } = useDailyQuote();

  if (isLoading) {
    return (
      <div className="w-full h-32 rounded-2xl bg-muted/50 animate-pulse" />
    );
  }

  if (!data) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground shadow-lg shadow-primary/25">
      <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Quote className="w-16 h-16 rotate-180" />
      </div>
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-primary-foreground/80 text-sm font-medium uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Daily Inspiration</span>
        </div>
        
        <blockquote className="font-display text-2xl md:text-3xl font-medium leading-snug">
          "{data.quote}"
        </blockquote>
        
        {data.author && (
          <cite className="text-sm font-medium text-primary-foreground/80 not-italic">
            — {data.author}
          </cite>
        )}
      </div>
    </div>
  );
}
