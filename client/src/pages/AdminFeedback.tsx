import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageSquare, Bug, Lightbulb, HelpCircle, ArrowLeft, Clock, User, Mail,
  CheckCircle, AlertCircle, Loader2, ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePageTitle } from "@/hooks/use-page-title";

interface FeedbackItem {
  id: number;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  feedback: MessageSquare,
  bug: Bug,
  feature: Lightbulb,
  support: HelpCircle,
};

const TYPE_COLORS: Record<string, string> = {
  feedback: "text-blue-500 bg-blue-50 dark:bg-blue-950/30",
  bug: "text-red-500 bg-red-50 dark:bg-red-950/30",
  feature: "text-amber-500 bg-amber-50 dark:bg-amber-950/30",
  support: "text-purple-500 bg-purple-50 dark:bg-purple-950/30",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
};

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState(item.adminNotes || "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async (updates: { status?: string; priority?: string; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/feedback/${item.id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] });
      toast({ title: "Updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update feedback",
        variant: "destructive",
      });
    },
  });

  const Icon = TYPE_ICONS[item.type] || MessageSquare;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TYPE_COLORS[item.type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold">{item.subject}</CardTitle>
                    <CardDescription className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.userName || "Anonymous"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {item.userEmail || "N/A"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[item.status]}>
                    {item.status.replace("_", " ")}
                  </Badge>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="p-4 rounded-xl bg-muted/30">
                <p className="text-sm text-foreground whitespace-pre-wrap">{item.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Select
                    value={item.status}
                    onValueChange={(value) => updateMutation.mutate({ status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select
                    value={item.priority || "normal"}
                    onValueChange={(value) => updateMutation.mutate({ priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Admin Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this feedback..."
                  rows={3}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateMutation.mutate({ adminNotes: notes })}
                  disabled={updateMutation.isPending || notes === item.adminNotes}
                >
                  {updateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Save Notes
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </motion.div>
  );
}

export default function AdminFeedback() {
  usePageTitle("Admin Feedback");
  const { data: feedbackItems, isLoading } = useQuery<FeedbackItem[]>({
    queryKey: ["/api/admin/feedback"],
    staleTime: 0,
    refetchOnMount: "always",
  });

  const stats = {
    total: feedbackItems?.length || 0,
    new: feedbackItems?.filter(f => f.status === "new").length || 0,
    inProgress: feedbackItems?.filter(f => f.status === "in_progress").length || 0,
    resolved: feedbackItems?.filter(f => f.status === "resolved").length || 0,
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2" data-testid="button-back-home">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">Customer Feedback</h1>
            <p className="text-muted-foreground text-sm">Manage and respond to user feedback</p>
          </div>
          <Link href="/admin/email">
            <Button variant="outline" size="sm" data-testid="link-admin-email">
              <Mail className="w-4 h-4 mr-1" />
              Email Dashboard
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "bg-secondary" },
            { label: "New", value: stats.new, color: "bg-blue-50 dark:bg-blue-950/30 text-blue-600" },
            { label: "In Progress", value: stats.inProgress, color: "bg-amber-50 dark:bg-amber-950/30 text-amber-600" },
            { label: "Resolved", value: stats.resolved, color: "bg-green-50 dark:bg-green-950/30 text-green-600" },
          ].map((stat, i) => (
            <Card key={i} className={`${stat.color} border-0`}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-display font-bold">{stat.value}</p>
                <p className="text-xs font-medium opacity-70">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feedback List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : feedbackItems?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold">No feedback yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Customer feedback will appear here once submitted.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbackItems?.map((item) => (
              <FeedbackCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
