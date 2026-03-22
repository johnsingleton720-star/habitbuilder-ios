import { useDailyQuote } from "@/hooks/use-habits";
import { Quote } from "lucide-react";

export function DailyQuote() {
  const { data, isLoading } = useDailyQuote();

  if (isLoading) {
    return (
      <div className="w-full h-20 rounded-2xl bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="p-4 space-y-2">
          <div className="h-3 w-full bg-muted/40 rounded-lg" />
          <div className="h-3 w-3/4 bg-muted/40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4 flex items-start gap-3" data-testid="card-daily-quote">
      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Quote className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground/80 italic leading-relaxed">
          "{data.quote}"
        </p>
        {data.author && (
          <p className="text-[11px] text-muted-foreground mt-1">
            — {data.author}
          </p>
        )}
      </div>
    </div>
  );
}
