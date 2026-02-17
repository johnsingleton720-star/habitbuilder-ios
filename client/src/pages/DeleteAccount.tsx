import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowLeft, Trash2, Loader2, Shield } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";

export default function DeleteAccount() {
  usePageTitle("Delete Account");
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [step, setStep] = useState<"info" | "confirm" | "done">("info");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/user/account");
      return res.json();
    },
    onSuccess: () => {
      setStep("done");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground" data-testid="text-login-required">
              Please sign in to manage your account.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle data-testid="text-deletion-complete">Account Deleted</CardTitle>
            <CardDescription>
              Your account and all associated data have been permanently deleted.
              You will be signed out shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <a href="/">
              <Button data-testid="button-return-home">Return to Home</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-4">
        <Link href="/account">
          <Button variant="ghost" size="sm" data-testid="button-back-account">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <CardTitle data-testid="text-delete-title">Delete Your Account</CardTitle>
            </div>
            <CardDescription>
              This action is permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === "info" && (
              <div className="space-y-4">
                <div className="rounded-md bg-destructive/10 p-4 space-y-2">
                  <p className="font-medium text-destructive text-sm">Deleting your account will permanently remove:</p>
                  <ul className="text-sm text-destructive/90 list-disc pl-5 space-y-1">
                    <li>Your profile and account information</li>
                    <li>All habits, action plans, and progress data</li>
                    <li>Mood entries and journal notes</li>
                    <li>AI coaching conversations</li>
                    <li>Quick tasks and reminders</li>
                    <li>Achievement progress and streaks</li>
                    <li>Forum posts and community content</li>
                    <li>Accountability partner connections</li>
                  </ul>
                </div>

                <div className="flex items-start gap-2 rounded-md bg-muted p-3">
                  <Shield className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    If you have an active subscription, it will be cancelled automatically. You will not be charged again.
                  </p>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setStep("confirm")}
                  data-testid="button-proceed-delete"
                >
                  I understand, continue
                </Button>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    data-testid="input-confirm-delete"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep("info");
                      setConfirmText("");
                    }}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    disabled={confirmText !== "DELETE" || deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                    data-testid="button-confirm-delete"
                  >
                    {deleteMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete My Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
