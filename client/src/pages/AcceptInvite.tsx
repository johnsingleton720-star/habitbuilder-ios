import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Check, X, Loader2, AlertCircle } from "lucide-react";
import { useRoute } from "wouter";
import { usePageTitle } from "@/hooks/use-page-title";

interface InviteInfo {
  id: number;
  status: string;
  inviterName: string;
  partnerEmail: string;
  sharedHabitTitles: string[];
}

export default function AcceptInvite() {
  usePageTitle("Accept Invitation");
  const [, params] = useRoute("/accept-invite/:token");
  const token = params?.token || "";
  const [responded, setResponded] = useState<"accepted" | "declined" | null>(null);

  const { data: invite, isLoading, error } = useQuery<InviteInfo>({
    queryKey: ["/api/accountability-partners/invite", token],
    queryFn: async () => {
      const res = await fetch(`/api/accountability-partners/invite/${token}`);
      if (!res.ok) throw new Error("Invitation not found");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const respondMutation = useMutation({
    mutationFn: async (action: "accept" | "decline") => {
      const res = await apiRequest("POST", `/api/accountability-partners/invite/${token}/respond`, { action });
      return res.json();
    },
    onSuccess: (_, action) => {
      setResponded(action === "accept" ? "accepted" : "declined");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loader-invite" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
            <h2 className="text-xl font-bold" data-testid="text-invite-error">Invitation Not Found</h2>
            <p className="text-muted-foreground">
              This invitation link may have expired or already been used.
            </p>
            <Button asChild>
              <a href="/" data-testid="link-go-home">Go to HabitBuilder.pro</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invite.status !== "pending" && !responded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <Check className="w-16 h-16 mx-auto text-primary" />
            <h2 className="text-xl font-bold" data-testid="text-invite-already-responded">
              Invitation Already {invite.status === "accepted" ? "Accepted" : "Responded To"}
            </h2>
            <p className="text-muted-foreground">
              This invitation has already been {invite.status}.
            </p>
            <Button asChild>
              <a href="/accountability" data-testid="link-go-accountability">View Accountability Partners</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (responded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            {responded === "accepted" ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold" data-testid="text-invite-accepted">Partnership Accepted!</h2>
                <p className="text-muted-foreground">
                  You're now accountability partners with <strong>{invite.inviterName}</strong>. 
                  You can view their shared progress on your Accountability page.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <X className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-bold" data-testid="text-invite-declined">Invitation Declined</h2>
                <p className="text-muted-foreground">
                  You've declined the invitation from {invite.inviterName}.
                </p>
              </>
            )}
            <Button asChild>
              <a href="/accountability" data-testid="link-go-accountability">
                {responded === "accepted" ? "View Shared Progress" : "Go to Dashboard"}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold" data-testid="text-invite-title">Accountability Partner Invitation</h2>
            <p className="text-muted-foreground">
              <strong>{invite.inviterName}</strong> wants you to be their accountability partner
            </p>
          </div>

          {invite.sharedHabitTitles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">They're sharing progress on:</p>
              <div className="flex flex-wrap gap-2">
                {invite.sharedHabitTitles.map((title, i) => (
                  <Badge key={i} variant="secondary" data-testid={`badge-habit-${i}`}>
                    {title}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>As an accountability partner, you'll be able to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>See their habit progress and streaks</li>
              <li>Receive progress updates</li>
              <li>Help keep each other on track</li>
            </ul>
          </div>

          {respondMutation.error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm" data-testid="text-respond-error">
              {respondMutation.error instanceof Error && respondMutation.error.message.includes("Unauthorized")
                ? "Please sign in first to accept this invitation."
                : "Something went wrong. Please try again."}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => respondMutation.mutate("decline")}
              disabled={respondMutation.isPending}
              data-testid="button-decline-invite"
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              className="flex-1"
              onClick={() => respondMutation.mutate("accept")}
              disabled={respondMutation.isPending}
              data-testid="button-accept-invite"
            >
              {respondMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Accept
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
