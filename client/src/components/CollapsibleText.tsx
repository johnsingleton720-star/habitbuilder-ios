import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleTextProps {
  text?: string;
  children?: React.ReactNode;
  lines?: number;
  className?: string;
  preWrap?: boolean;
  mono?: boolean;
}

const LINE_HEIGHT_PX = 26;

export function CollapsibleText({
  text,
  children,
  lines = 3,
  className,
  preWrap = true,
  mono = false,
}: CollapsibleTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const collapsedMaxHeight = lines * LINE_HEIGHT_PX;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 2);
  }, [text, children, lines]);

  const content = children ?? (
    <p
      className={cn(
        preWrap ? "whitespace-pre-wrap" : undefined,
        mono ? "font-mono text-sm" : undefined,
        "leading-relaxed",
      )}
    >
      {text}
    </p>
  );

  return (
    <div className={cn("space-y-0.5", className)}>
      <div
        ref={containerRef}
        style={{
          maxHeight: expanded ? "2000px" : `${collapsedMaxHeight}px`,
          overflow: "hidden",
          transition: "max-height 0.3s ease-in-out",
        }}
      >
        {content}
      </div>
      {isClamped && (
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
      )}
    </div>
  );
}
