import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  Loader2, 
  Sparkles, 
  Heart,
  Lightbulb,
  HelpCircle,
  Send,
  Smile,
  Meh,
  Frown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Crown,
  ArrowRight,
  Lock,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CollapsibleText } from "./CollapsibleText";

interface CoachingCheckinProps {
  habitId: number;
  habitTitle: string;
}

interface CheckinResponse {
  greeting: string;
  progressAcknowledgment: string;
  motivation: string;
  tipForTomorrow: string;
  questionForUser: string;
  encouragingClose: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_FOLLOWUPS = 2;

const moodOptions = [
  { value: "great", label: "Great", icon: Smile, color: "text-green-500" },
  { value: "okay", label: "Okay", icon: Meh, color: "text-yellow-500" },
  { value: "struggling", label: "Struggling", icon: Frown, color: "text-red-500" },
];

export function CoachingCheckin({ habitId, habitTitle }: CoachingCheckinProps) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [mood, setMood] = useState<string | null>(null);
  const [checkinData, setCheckinData] = useState<CheckinResponse | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [followUpMessages, setFollowUpMessages] = useState<ConversationMessage[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isFollowUpRecording, setIsFollowUpRecording] = useState(false);
  const [isFollowUpTranscribing, setIsFollowUpTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const followUpRecorderRef = useRef<MediaRecorder | null>(null);
  const followUpChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRequestIdRef = useRef<number>(0);
  
  const { isPremium, isPro, isFreeUser } = useSubscription();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const assistantCount = followUpMessages.filter(m => m.role === "assistant").length;
  const canFollowUp = (isPro || isPremium) && assistantCount < MAX_FOLLOWUPS;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      audioUrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      audioUrlRef.current = null;
      setIsSpeaking(false);
      setIsLoadingAudio(false);
      setIsAudioReady(false);
      audioRequestIdRef.current += 1;
    }
  }, [open]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [checkinData, followUpMessages]);

  const checkinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/coaching-checkin`, {
        feedback,
        mood,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCheckinData(data);
    },
  });

  const followUpMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const initialCoachContent = checkinData
        ? `${checkinData.greeting} ${checkinData.progressAcknowledgment} ${checkinData.motivation} ${checkinData.tipForTomorrow} ${checkinData.questionForUser} ${checkinData.encouragingClose}`
        : "";
      const conversationHistory: ConversationMessage[] = [
        { role: "assistant", content: initialCoachContent },
        ...followUpMessages,
      ];
      const res = await apiRequest("POST", `/api/habits/${habitId}/coaching-followup`, {
        conversationHistory,
        userMessage,
      });
      return res.json();
    },
    onSuccess: (data, userMessage) => {
      setFollowUpMessages(prev => [
        ...prev,
        { role: "user", content: userMessage },
        { role: "assistant", content: data.reply },
      ]);
      setFollowUpInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Follow-up failed",
        description: error?.message || "Could not get a response. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartCheckin = () => {
    checkinMutation.mutate();
  };

  const handleSendFollowUp = () => {
    const message = followUpInput.trim();
    if (!message || followUpMutation.isPending) return;
    followUpMutation.mutate(message);
  };

  const handleFollowUpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendFollowUp();
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFeedback("");
    setMood(null);
    setCheckinData(null);
    setFollowUpMessages([]);
    setFollowUpInput("");
    stopRecording();
    stopFollowUpRecording();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob, "feedback");
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startFollowUpRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      followUpRecorderRef.current = mediaRecorder;
      followUpChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          followUpChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(followUpChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAudio(audioBlob, "followup");
      };
      
      mediaRecorder.start();
      setIsFollowUpRecording(true);
    } catch (error) {
      console.error("Error starting follow-up recording:", error);
    }
  };

  const stopFollowUpRecording = () => {
    if (followUpRecorderRef.current && followUpRecorderRef.current.state === 'recording') {
      followUpRecorderRef.current.stop();
      setIsFollowUpRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob, target: "feedback" | "followup") => {
    if (target === "feedback") setIsTranscribing(true);
    else setIsFollowUpTranscribing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const response = await apiRequest("POST", "/api/transcribe", { audio: base64Audio });
      const data = await response.json();
      
      if (data.transcript) {
        if (target === "feedback") {
          setFeedback(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
        } else {
          setFollowUpInput(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
        }
      }
    } catch (error) {
      console.error("Error transcribing:", error);
    } finally {
      if (target === "feedback") setIsTranscribing(false);
      else setIsFollowUpTranscribing(false);
    }
  };

  const stopAudio = () => {
    audioRequestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    audioUrlRef.current = null;
    setIsSpeaking(false);
    setIsLoadingAudio(false);
    setIsAudioReady(false);
  };

  const speakResponse = async () => {
    if (!checkinData) return;
    
    if (isSpeaking) {
      stopAudio();
      return;
    }
    
    if (isLoadingAudio) {
      stopAudio();
      return;
    }
    
    if (isAudioReady && audioRef.current) {
      setIsAudioReady(false);
      setIsSpeaking(true);
      try {
        await audioRef.current.play();
        return;
      } catch (e) {
        console.error("Retry play failed:", e);
        setIsSpeaking(false);
        audioRef.current = null;
        audioUrlRef.current = null;
        toast({
          title: "Playback failed",
          description: "Please try again",
          variant: "destructive"
        });
        return;
      }
    }
    
    const currentRequestId = ++audioRequestIdRef.current;
    setIsLoadingAudio(true);
    setIsAudioReady(false);
    
    try {
      const fullText = `${checkinData.greeting} ${checkinData.progressAcknowledgment} ${checkinData.motivation} Here's a tip for tomorrow: ${checkinData.tipForTomorrow}`;
      
      const response = await apiRequest("POST", "/api/text-to-speech", { text: fullText });
      
      if (currentRequestId !== audioRequestIdRef.current) {
        return;
      }
      
      const data = await response.json();
      
      if (currentRequestId !== audioRequestIdRef.current) {
        return;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.audio) {
        const audioUrl = `data:audio/mpeg;base64,${data.audio}`;
        audioUrlRef.current = audioUrl;
        
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          setIsLoadingAudio(false);
          setIsAudioReady(false);
          audioRef.current = null;
          audioUrlRef.current = null;
        };
        
        audio.onerror = (e) => {
          console.error("Audio error event:", e, audio.error);
          setIsSpeaking(false);
          setIsLoadingAudio(false);
          setIsAudioReady(false);
          audioRef.current = null;
          audioUrlRef.current = null;
          toast({
            title: "Audio error",
            description: "Could not load audio. Try again.",
            variant: "destructive"
          });
        };
        
        setIsLoadingAudio(false);
        
        try {
          await audio.play();
          setIsSpeaking(true);
        } catch (playError: any) {
          console.error("Audio play error:", playError);
          if (playError.name === 'NotAllowedError') {
            setIsAudioReady(true);
            toast({
              title: "Ready to play",
              description: "Tap the speaker button to hear the response",
            });
          } else {
            setIsAudioReady(false);
            audioRef.current = null;
            audioUrlRef.current = null;
            toast({
              title: "Playback failed",
              description: "Could not play audio. Please try again.",
              variant: "destructive"
            });
          }
        }
      } else {
        throw new Error("No audio data received");
      }
    } catch (error: any) {
      console.error("Error with text-to-speech:", error);
      if (currentRequestId === audioRequestIdRef.current) {
        setIsSpeaking(false);
        setIsLoadingAudio(false);
        toast({
          title: "Voice playback unavailable",
          description: error.message === "Text-to-speech requires Premium subscription" 
            ? "This feature requires a Premium subscription"
            : "Could not generate voice response. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  if (isFreeUser) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2" data-testid="button-coaching-checkin">
            <MessageCircle className="w-4 h-4" />
            Talk to Coach
            <Lock className="w-3 h-3 text-amber-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-base">AI Coach is a Pro feature</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Get personalized coaching conversations, progress check-ins, and motivational support with a Pro or Premium plan.
              </p>
            </div>
            <Button
              onClick={() => { setOpen(false); navigate("/paywall"); }}
              className="gap-2"
              data-testid="button-upgrade-coach"
            >
              <Crown className="w-4 h-4" />
              See Plans
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-coaching-checkin">
          <MessageCircle className="w-4 h-4" />
          Talk to Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg flex flex-col" style={{ maxHeight: '85vh', height: 'auto' }}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="block">Your AI Coach</span>
              <span className="text-sm font-normal text-muted-foreground">{habitTitle}</span>
            </div>
            {isPremium && checkinData && (
              <Button 
                size="icon" 
                variant={isAudioReady ? "default" : "ghost"} 
                onClick={speakResponse}
                title={isSpeaking ? "Stop playback" : isLoadingAudio ? "Cancel loading" : isAudioReady ? "Tap to play" : "Listen to coach response"}
                className={isAudioReady ? "animate-pulse" : ""}
                data-testid="button-speak-response"
              >
                {isLoadingAudio ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isSpeaking ? (
                  <VolumeX className="w-5 h-5 text-destructive" />
                ) : isAudioReady ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto -mx-6 px-6 py-2"
          style={{ maxHeight: 'calc(85vh - 100px)', minHeight: '200px' }}
        >
        {checkinMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">Your coach is preparing feedback...</p>
          </div>
        ) : checkinData ? (
          <div className="space-y-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <p className="font-medium text-primary">{checkinData.greeting}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{checkinData.progressAcknowledgment}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{checkinData.motivation}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Tomorrow's Tip</p>
                    <p className="text-sm mt-1">{checkinData.tipForTomorrow}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm italic">{checkinData.questionForUser}</p>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-muted-foreground text-sm">
              {checkinData.encouragingClose}
            </p>

            {followUpMessages.length > 0 && (
              <div className="space-y-3 pt-2" data-testid="followup-conversation">
                {followUpMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-2",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                    data-testid={`chat-bubble-${msg.role}-${idx}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-md px-3 py-2 max-w-[80%] text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <CollapsibleText text={msg.content} lines={4} className="text-sm" />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {followUpMutation.isPending && (
                  <div className="flex gap-2 justify-start" data-testid="followup-loading">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="rounded-md px-3 py-2 bg-muted text-sm flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                )}
              </div>
            )}

            {(isPro || isPremium) && canFollowUp ? (
              <div className="space-y-2 pt-2">
                <div className="relative">
                  <Textarea
                    placeholder="Reply to your coach..."
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    onKeyDown={handleFollowUpKeyDown}
                    rows={2}
                    className={cn("text-sm", isPremium ? "pr-20" : "pr-12")}
                    disabled={followUpMutation.isPending}
                    data-testid="input-followup"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {isPremium && (
                      <Button
                        size="icon"
                        variant={isFollowUpRecording ? "destructive" : "ghost"}
                        className="h-7 w-7"
                        onClick={isFollowUpRecording ? stopFollowUpRecording : startFollowUpRecording}
                        disabled={isFollowUpTranscribing || followUpMutation.isPending}
                        title={isFollowUpRecording ? "Stop recording" : "Record voice reply"}
                        data-testid="button-followup-voice"
                      >
                        {isFollowUpTranscribing ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isFollowUpRecording ? (
                          <MicOff className="w-3.5 h-3.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={handleSendFollowUp}
                      disabled={!followUpInput.trim() || followUpMutation.isPending}
                      data-testid="button-send-followup"
                    >
                      {followUpMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
                {isFollowUpRecording && (
                  <p className="text-xs text-destructive animate-pulse">Recording... Tap microphone to stop</p>
                )}
                {isFollowUpTranscribing && (
                  <p className="text-xs text-muted-foreground">Transcribing your reply...</p>
                )}
                <p className="text-xs text-muted-foreground text-center">
                  {MAX_FOLLOWUPS - assistantCount} follow-up{MAX_FOLLOWUPS - assistantCount !== 1 ? "s" : ""} remaining
                </p>
              </div>
            ) : (isPro || isPremium) && !canFollowUp && followUpMessages.length > 0 ? (
              <div className="pt-2 space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  You've used all follow-ups for this session.
                </p>
                <Button onClick={handleClose} className="w-full" data-testid="button-close-checkin">
                  Done
                </Button>
              </div>
            ) : (
              <Button onClick={handleClose} className="w-full" data-testid="button-close-checkin">
                Thanks, Coach!
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-3">How are you feeling about your progress?</p>
              <div className="flex gap-2">
                {moodOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      variant={mood === option.value ? "default" : "outline"}
                      className={cn("flex-1 gap-2", mood !== option.value && option.color)}
                      onClick={() => setMood(option.value)}
                      data-testid={`button-mood-${option.value}`}
                    >
                      <Icon className="w-4 h-4" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-3">Anything you want to share with your coach? (optional)</p>
              <div className="relative">
                <Textarea
                  placeholder="I've been struggling with... / I'm proud that... / I need help with..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className={isPremium ? "pr-12" : ""}
                  data-testid="input-feedback"
                />
                {isPremium && (
                  <Button
                    size="icon"
                    variant={isRecording ? "destructive" : "ghost"}
                    className="absolute right-2 top-2"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    title={isRecording ? "Stop recording" : "Record voice message"}
                    data-testid="button-voice-record"
                  >
                    {isTranscribing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isRecording ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
              {isRecording && (
                <p className="text-xs text-destructive mt-1 animate-pulse">Recording... Tap microphone to stop</p>
              )}
              {isTranscribing && (
                <p className="text-xs text-muted-foreground mt-1">Transcribing your message...</p>
              )}
            </div>

            <Button 
              onClick={handleStartCheckin} 
              className="w-full gap-2"
              disabled={checkinMutation.isPending}
              data-testid="button-get-coaching"
            >
              <Send className="w-4 h-4" />
              Get Personalized Coaching
            </Button>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
