import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, MessageCircle, Crown, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/use-page-title";

interface Conversation {
  id: number;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadCount: number;
  otherUser: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

interface Message {
  id: number;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ConversationDetail {
  conversation: any;
  otherUser: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
  messages: Message[];
}

function PremiumRequired() {
  const [, navigate] = useLocation();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Crown className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Messaging is a Premium Feature</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Connect directly with other habit builders through private messages. Upgrade to Pro or Premium to access messaging.
      </p>
      <Button onClick={() => navigate("/paywall")} size="lg" className="gap-2" data-testid="button-upgrade-messages">
        <Lock className="w-4 h-4" />
        Upgrade to Pro
      </Button>
    </div>
  );
}

function ConversationList({ onSelect }: { onSelect: (id: number) => void }) {
  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ["/api/community/messages"],
    retry: false,
  });

  const isPremiumError = (error as any)?.message?.includes("PREMIUM_REQUIRED");

  if (isPremiumError) {
    return <PremiumRequired />;
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <Card className="p-8 text-center">
        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Start a conversation by visiting someone's profile in the community
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {conversations.map((convo) => (
        <Card 
          key={convo.id} 
          className="cursor-pointer hover-elevate"
          onClick={() => onSelect(convo.id)}
          data-testid={`card-conversation-${convo.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={convo.otherUser?.avatarUrl || undefined} />
                <AvatarFallback>{convo.otherUser?.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{convo.otherUser?.displayName || "Unknown User"}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(convo.lastMessageAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className="text-sm text-muted-foreground truncate">{convo.lastMessagePreview || "No messages"}</p>
                  {convo.unreadCount > 0 && (
                    <Badge className="shrink-0">{convo.unreadCount}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ConversationDetail({ conversationId, onBack }: { conversationId: number; onBack: () => void }) {
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<ConversationDetail>({
    queryKey: ["/api/community/messages", conversationId],
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: () => apiRequest("POST", "/api/community/messages", {
      conversationId,
      content: newMessage,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/messages"] });
      setNewMessage("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 flex-shrink-0" data-testid="button-back-messages">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Avatar 
          className="w-8 h-8 md:w-10 md:h-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => data?.otherUser && navigate(`/community/profile/${data.otherUser.userId}`)}
        >
          <AvatarImage src={data?.otherUser?.avatarUrl || undefined} />
          <AvatarFallback>{data?.otherUser?.displayName?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm md:text-base truncate">{data?.otherUser?.displayName || "Unknown User"}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {!data?.messages.length ? (
          <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
        ) : (
          data.messages.map((msg) => {
            const isOwnMessage = msg.senderId !== data.otherUser?.userId;
            return (
              <div 
                key={msg.id} 
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Textarea
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
              e.preventDefault();
              sendMessage.mutate();
            }
          }}
          data-testid="textarea-message"
        />
        <Button 
          size="icon"
          onClick={() => sendMessage.mutate()}
          disabled={!newMessage.trim() || sendMessage.isPending}
          className="shrink-0 h-auto"
          data-testid="button-send-message"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Messages() {
  usePageTitle("Messages", "Private messages with your accountability partners and the HabitBuilder.pro community.");
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [, navigate] = useLocation();

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      {selectedConversation ? (
        <ConversationDetail 
          conversationId={selectedConversation} 
          onBack={() => setSelectedConversation(null)} 
        />
      ) : (
        <>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="gap-2" data-testid="button-back-community">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Community</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Messages</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Your private conversations</p>
            </div>
          </div>
          <ConversationList onSelect={setSelectedConversation} />
        </>
      )}
    </div>
  );
}
