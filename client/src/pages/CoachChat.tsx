import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSubscription } from "@/hooks/use-subscription";
import { Link } from "wouter";
import { 
  ArrowLeft, Send, Loader2, MessageCircle, Plus, 
  Clock, Sparkles, Crown, AlertTriangle 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CoachChat as CoachChatType, CoachMessage } from "@shared/schema";
import { CollapsibleText } from "@/components/CollapsibleText";

interface CoachUsage {
  used: number;
  limit: number;
  resetAt: string | null;
}

export default function CoachChatPage() {
  usePageTitle("Coach Chat", "Chat with your AI habit coach for personalized guidance");
  const { toast } = useToast();
  const { features } = useSubscription();
  const queryClient = useQueryClient();
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: usage, isLoading: usageLoading } = useQuery<CoachUsage>({
    queryKey: ["/api/coach/usage"],
  });

  const { data: chatHistory, isLoading: historyLoading } = useQuery<CoachChatType[]>({
    queryKey: ["/api/coach/history"],
  });

  const { data: activeChat, isLoading: chatLoading } = useQuery<{ chat: CoachChatType; messages: CoachMessage[] }>({
    queryKey: ["/api/coach/chat", activeChatId],
    enabled: !!activeChatId,
  });

  const startChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/coach/start");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed to start chat");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setActiveChatId(data.chat.id);
      queryClient.invalidateQueries({ queryKey: ["/api/coach/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/usage"] });
    },
    onError: (err: Error) => {
      toast({ title: "Couldn't start chat", description: err.message, variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", `/api/coach/chat/${activeChatId}/message`, { message });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/coach/chat", activeChatId] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/usage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/history"] });
    },
    onError: (err: Error) => {
      toast({ title: "Message failed", description: err.message, variant: "destructive" });
    },
  });

  const endChatMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/coach/chat/${activeChatId}/end`);
      if (!res.ok) throw new Error("Failed to end chat");
      return res.json();
    },
    onSuccess: () => {
      setActiveChatId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/coach/history"] });
      toast({ title: "Session ended", description: "Great talking with you! Start a new chat anytime." });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat?.messages]);

  const handleSend = () => {
    const trimmed = messageInput.trim();
    if (!trimmed || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const usagePercent = usage ? Math.round((usage.used / usage.limit) * 100) : 0;
  const isNearLimit = usage ? usage.used >= usage.limit * 0.8 : false;
  const isAtLimit = usage ? usage.used >= usage.limit : false;

  if (!features.hasCoachChat) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <Crown className="w-12 h-12 text-amber-500 mx-auto" />
              <h2 className="font-display text-2xl font-bold">Premium Feature</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Coach Chat is available exclusively for Premium subscribers. Get personalized habit coaching through interactive conversations with your AI coach.
              </p>
              <Link href="/paywall">
                <Button data-testid="button-upgrade-premium">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle font-body flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50 px-4 py-3 safe-top">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {activeChatId ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setActiveChatId(null)}
                data-testid="button-back-chat-list"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            ) : (
              <Link href="/">
                <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <h1 className="font-display text-lg font-bold truncate" data-testid="text-coach-title">
                {activeChatId && activeChat ? activeChat.chat.title : "Coach Chat"}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            {usage && (
              <div className="flex items-center gap-2" data-testid="coach-usage-display">
                <div className="text-right">
                  <p className={`text-xs font-medium ${isAtLimit ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"}`}>
                    {usage.used}/{usage.limit}
                  </p>
                  <p className="text-xs text-muted-foreground">messages</p>
                </div>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"}`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-4xl h-full flex flex-col">
          {!activeChatId ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isAtLimit && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive" data-testid="text-limit-reached">Monthly limit reached</p>
                      <p className="text-sm text-muted-foreground">
                        You've used all {usage?.limit} coach messages this month. 
                        {usage?.resetAt && ` Your limit resets on ${new Date(usage.resetAt).toLocaleDateString()}.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isNearLimit && !isAtLimit && (
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="pt-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-600 dark:text-amber-400" data-testid="text-limit-warning">Running low on messages</p>
                      <p className="text-sm text-muted-foreground">
                        You've used {usage?.used} of {usage?.limit} coach messages this month. 
                        {usage?.resetAt && ` Resets on ${new Date(usage.resetAt).toLocaleDateString()}.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-center space-y-3 py-4">
                <Sparkles className="w-10 h-10 text-primary mx-auto" />
                <h2 className="font-display text-xl font-bold">Your AI Habit Coach</h2>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  Get personalized advice on building habits, staying consistent, and overcoming challenges. Start a new conversation or continue a previous one.
                </p>
                <Button 
                  onClick={() => startChatMutation.mutate()}
                  disabled={startChatMutation.isPending || isAtLimit}
                  data-testid="button-new-chat"
                >
                  {startChatMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> New Coaching Session</>
                  )}
                </Button>
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : chatHistory && chatHistory.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">Previous Sessions</h3>
                  {chatHistory.map((chat) => (
                    <Card 
                      key={chat.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => setActiveChatId(chat.id)}
                      data-testid={`chat-history-${chat.id}`}
                    >
                      <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <MessageCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{chat.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {chat.messageCount || 0} messages
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!chat.isActive && (
                            <Badge variant="secondary" className="text-xs">Ended</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages-area">
                {chatLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : activeChat?.messages ? (
                  <AnimatePresence initial={false}>
                    {activeChat.messages.map((msg, idx) => (
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div 
                          className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-br-md" 
                              : "bg-muted rounded-bl-md"
                          }`}
                          data-testid={`chat-message-${msg.role}-${idx}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3 h-3 text-primary" />
                              <span className="text-xs font-medium text-primary">Coach</span>
                            </div>
                          )}
                          {msg.role === "assistant" ? (
                            <CollapsibleText text={msg.content} threshold={320} className="text-sm" />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          )}
                          {msg.createdAt && (
                            <p className={`text-xs mt-1.5 ${msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {sendMessageMutation.isPending && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-start"
                      >
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-3 h-3 text-primary" />
                            <span className="text-xs font-medium text-primary">Coach</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : null}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t bg-background p-4 space-y-3">
                {activeChat?.chat?.isActive === false ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">This session has ended.</p>
                    <Button 
                      onClick={() => { setActiveChatId(null); startChatMutation.mutate(); }}
                      disabled={isAtLimit}
                      data-testid="button-start-new-after-end"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Start New Session
                    </Button>
                  </div>
                ) : isAtLimit ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-destructive font-medium" data-testid="text-chat-limit-reached">
                      Monthly message limit reached ({usage?.used}/{usage?.limit})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {usage?.resetAt && `Resets on ${new Date(usage.resetAt).toLocaleDateString()}`}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type your message..."
                        className="resize-none min-h-[44px] max-h-[120px]"
                        rows={1}
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-coach-message"
                      />
                      <Button
                        onClick={handleSend}
                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                        size="icon"
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {usage && `${usage.limit - usage.used} messages remaining this month`}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => endChatMutation.mutate()}
                        disabled={endChatMutation.isPending}
                        className="text-muted-foreground"
                        data-testid="button-thanks-coach"
                      >
                        {endChatMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <Clock className="w-4 h-4 mr-1" />
                        )}
                        Thanks, Coach!
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
