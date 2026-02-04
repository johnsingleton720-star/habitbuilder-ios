import { Button } from "@/components/ui/button";
import { SiX, SiFacebook, SiLinkedin } from "react-icons/si";
import { Link2, Check } from "lucide-react";
import { useState } from "react";

interface SocialShareProps {
  title?: string;
  text?: string;
  url?: string;
  variant?: "default" | "compact";
}

export function SocialShare({ 
  title = "Habit Builder - Build habits that actually stick",
  text = "I'm building better habits with Habit Builder! AI-powered coaching helps me stay on track. Try it free:",
  url,
  variant = "default"
}: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.origin : "");
  
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(text);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const openShareWindow = (url: string) => {
    window.open(url, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={() => openShareWindow(shareLinks.twitter)}
          data-testid="button-share-twitter"
          title="Share on X (Twitter)"
        >
          <SiX className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => openShareWindow(shareLinks.facebook)}
          data-testid="button-share-facebook"
          title="Share on Facebook"
        >
          <SiFacebook className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => openShareWindow(shareLinks.linkedin)}
          data-testid="button-share-linkedin"
          title="Share on LinkedIn"
        >
          <SiLinkedin className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={copyToClipboard}
          data-testid="button-copy-link"
          title="Copy link"
        >
          {copied ? <Check className="w-4 h-4 text-primary" /> : <Link2 className="w-4 h-4" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">Share with friends:</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShareWindow(shareLinks.twitter)}
          className="gap-2"
          data-testid="button-share-twitter"
        >
          <SiX className="w-4 h-4" />
          <span>X</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShareWindow(shareLinks.facebook)}
          className="gap-2"
          data-testid="button-share-facebook"
        >
          <SiFacebook className="w-4 h-4" />
          <span>Facebook</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => openShareWindow(shareLinks.linkedin)}
          className="gap-2"
          data-testid="button-share-linkedin"
        >
          <SiLinkedin className="w-4 h-4" />
          <span>LinkedIn</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={copyToClipboard}
          className="gap-2"
          data-testid="button-copy-link"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-primary" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              <span>Copy Link</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
