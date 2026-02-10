import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import {
  Mail, Send, Users, ArrowLeft, Loader2, CheckCircle, AlertCircle, Crown, Star
} from "lucide-react";

interface Recipient {
  email: string;
  name: string;
  tier: string;
}

interface RecipientsResponse {
  count: number;
  recipients: Recipient[];
}

interface SendResult {
  success: boolean;
  totalRecipients: number;
  sent: number;
  failed: number;
  errors: string[];
}

const TIER_LABELS: Record<string, string> = {
  all: "All Users",
  free: "Free / Trial Users",
  pro: "Pro Users",
  premium: "Premium Users",
};

export default function AdminEmail() {
  usePageTitle("Admin - Email");
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientFilter, setRecipientFilter] = useState("all");
  const [singleEmail, setSingleEmail] = useState("");
  const [sendMode, setSendMode] = useState<"bulk" | "single">("bulk");
  const [lastResult, setLastResult] = useState<SendResult | null>(null);

  const { data: recipientData, isLoading: isLoadingRecipients } = useQuery<RecipientsResponse>({
    queryKey: ["/api/admin/emails/recipients", recipientFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/emails/recipients?filter=${recipientFilter}`);
      if (!res.ok) throw new Error("Failed to fetch recipients");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { subject: string; body: string; recipientFilter: string; singleEmail?: string }) => {
      const res = await apiRequest("POST", "/api/admin/emails/send", data);
      return res.json() as Promise<SendResult>;
    },
    onSuccess: (result) => {
      setLastResult(result);
      toast({
        title: "Emails Sent",
        description: `Successfully sent ${result.sent} email(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}.`,
      });
    },
    onError: (err: any) => {
      toast({
        title: "Send Failed",
        description: err.message || "Could not send emails. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (!subject.trim()) {
      toast({ title: "Subject required", variant: "destructive" });
      return;
    }
    if (!body.trim()) {
      toast({ title: "Email body required", variant: "destructive" });
      return;
    }
    if (sendMode === "single" && !singleEmail.trim()) {
      toast({ title: "Email address required", variant: "destructive" });
      return;
    }

    sendMutation.mutate({
      subject,
      body,
      recipientFilter: sendMode === "bulk" ? recipientFilter : "all",
      ...(sendMode === "single" ? { singleEmail } : {}),
    });
  };

  const tierIcon = (tier: string) => {
    if (tier === "premium") return <Crown className="w-3 h-3" />;
    if (tier === "pro") return <Star className="w-3 h-3" />;
    return null;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      <div className="mb-2">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Mail className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Email Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Send emails to your users
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/feedback">
            <Button variant="outline" size="sm" data-testid="link-admin-feedback">
              Feedback
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Compose Email
              </CardTitle>
              <CardDescription>
                Write and send emails to your users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={sendMode === "bulk" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("bulk")}
                  data-testid="button-mode-bulk"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Bulk Send
                </Button>
                <Button
                  variant={sendMode === "single" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSendMode("single")}
                  data-testid="button-mode-single"
                >
                  <Mail className="w-4 h-4 mr-1" />
                  Single Email
                </Button>
              </div>

              {sendMode === "bulk" ? (
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Select value={recipientFilter} onValueChange={setRecipientFilter}>
                    <SelectTrigger data-testid="select-recipient-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="free">Free / Trial Users</SelectItem>
                      <SelectItem value="pro">Pro Users</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {isLoadingRecipients ? (
                      "Loading..."
                    ) : (
                      `${recipientData?.count || 0} recipient(s) match this filter`
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="single-email">Email Address</Label>
                  <Input
                    id="single-email"
                    type="email"
                    placeholder="user@example.com"
                    value={singleEmail}
                    onChange={(e) => setSingleEmail(e.target.value)}
                    data-testid="input-single-email"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Email subject line..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-email-subject"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Write your email message here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="resize-y"
                  data-testid="input-email-body"
                />
                <p className="text-xs text-muted-foreground">
                  Line breaks will be preserved. The email will include HabitBuilder.pro branding automatically.
                </p>
              </div>

              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="w-full"
                data-testid="button-send-email"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {sendMode === "bulk"
                  ? `Send to ${recipientData?.count || 0} Recipient(s)`
                  : "Send Email"}
              </Button>
            </CardContent>
          </Card>

          {lastResult && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {lastResult.failed === 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">
                      {lastResult.sent} email(s) sent successfully
                      {lastResult.failed > 0 && `, ${lastResult.failed} failed`}
                    </p>
                    {lastResult.errors.length > 0 && (
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        {lastResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recipients Preview
              </CardTitle>
              <CardDescription>
                {TIER_LABELS[recipientFilter] || "All Users"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRecipients ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : recipientData && recipientData.recipients.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {recipientData.recipients.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {r.name || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">
                        {tierIcon(r.tier)}
                        <span className="ml-1">{r.tier}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recipients found
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
