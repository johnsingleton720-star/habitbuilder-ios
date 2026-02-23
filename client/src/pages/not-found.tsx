import { Card, CardContent } from "@/components/ui/card";
import { Compass, Home, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

export default function NotFound() {
  usePageTitle("Page Not Found", "The page you're looking for doesn't exist. Return to HabitBuilder.pro to continue building better habits.");
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-subtle p-4">
      <Card className="w-full max-w-md border-primary/10">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center">
              <Compass className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-lg">
              ?
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Looks like this page doesn't exist. Let's get you back on track with your habits.
          </p>
          
          <div className="mt-6 w-full">
            <Link href="/" className="block">
              <Button className="w-full gap-2 shadow-lg shadow-primary/20" data-testid="button-return-home">
                <Home className="w-4 h-4" />
                Back to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
