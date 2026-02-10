import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, RefreshCw, Trash2, Globe, Mail, KeyRound } from "lucide-react";

interface LoginTroubleshootDialogProps {
  trigger?: React.ReactNode;
}

export function LoginTroubleshootDialog({ trigger }: LoginTroubleshootDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-1 h-auto p-0 hover:bg-transparent">
            <HelpCircle className="w-3 h-3" />
            Having trouble signing in?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Trouble Signing In?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-muted-foreground text-sm">
            If you see an error like "Something unexpected happened", try these steps:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <RefreshCw className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Wait and try again</p>
                <p className="text-xs text-muted-foreground">Sometimes there's a temporary issue. Wait a minute and try signing in again.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Trash2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Clear your browser cookies</p>
                <p className="text-xs text-muted-foreground">On iPhone: Settings &gt; Safari &gt; Clear History and Website Data</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <KeyRound className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Forgot your password?</p>
                <p className="text-xs text-muted-foreground">
                  If you signed up with email and password, you can reset it on Replit:{" "}
                  <a href="https://replit.com/forgot" target="_blank" rel="noopener noreferrer" className="text-primary underline" data-testid="link-reset-password">
                    Reset your password here
                  </a>
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Globe className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Try a different sign-in method</p>
                <p className="text-xs text-muted-foreground">If Google isn't working, try Apple or email sign-in instead.</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <Mail className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Still not working?</p>
                <p className="text-xs text-muted-foreground">The authentication service may be experiencing issues. Please try again in a few minutes.</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center pt-2">
            These issues are usually temporary and resolve themselves quickly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
