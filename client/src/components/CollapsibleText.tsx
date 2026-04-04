import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleTextProps {
  text: string;
  threshold?: number;
  className?: string;
  preWrap?: boolean;
}

export function CollapsibleText({
  text,
  threshold = 260,
  className,
  preWrap = true,
}: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.length <= threshold) {
    return (
      <p className={cn(preWrap ? "whitespace-pre-wrap" : undefined, "leading-relaxed", className)}>
        {text}
      </p>
    );
  }

  const preview = text.slice(0, threshold).trimEnd();

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn(preWrap ? "whitespace-pre-wrap" : undefined, "leading-relaxed")}>
        {expanded ? text : `${preview}…`}
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto py-0.5 px-1 text-xs text-muted-foreground hover:text-foreground gap-1"
        onClick={() => setExpanded((v) => !v)}
        data-testid="button-collapsible-toggle"
      >
        {expanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Show less
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            Show more
          </>
        )}
      </Button>
    </div>
  );
}
