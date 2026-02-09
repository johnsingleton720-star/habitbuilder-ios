import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Chrome } from "lucide-react";
import { SiAndroid } from "react-icons/si";

interface InstallAppDialogProps {
  trigger?: React.ReactNode;
}

export function InstallAppDialog({ trigger }: InstallAppDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Smartphone className="w-4 h-4" />
            Get the App
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Install HabitBuilder.pro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-muted-foreground text-sm">
            Add HabitBuilder.pro to your home screen for quick access - it works just like a regular app!
          </p>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Apple className="w-5 h-5" />
                iPhone / iPad (Safari)
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                <li>Tap the <strong>Share</strong> button (square with arrow)</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <SiAndroid className="w-5 h-5 text-green-600" />
                Android (Chrome)
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                <li>Tap the <strong>menu</strong> button (three dots)</li>
                <li>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></li>
                <li>Tap <strong>"Install"</strong> to confirm</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
              <div className="flex items-center gap-2 font-medium">
                <Chrome className="w-5 h-5 text-blue-500" />
                Desktop (Chrome/Edge)
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 ml-7 list-decimal">
                <li>Click the <strong>install icon</strong> in the address bar</li>
                <li>Or click menu and select <strong>"Install HabitBuilder.pro"</strong></li>
              </ol>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Once installed, the app opens in full screen and can work offline for basic features.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
