import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-subscription";

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { isPremium } = useSubscription();

  // Auto-scroll to bottom when checkin data changes
  useEffect(() => {
    if (checkinData && scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [checkinData]);

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

  const handleStartCheckin = () => {
    checkinMutation.mutate();
  };

  const handleClose = () => {
    setOpen(false);
    setFeedback("");
    setMood(null);
    setCheckinData(null);
    stopRecording();
  };

  // Voice recording functions for Premium users
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
        await transcribeAudio(audioBlob);
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

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const response = await apiRequest("POST", "/api/transcribe", { audio: base64Audio });
      const data = await response.json();
      
      if (data.transcript) {
        setFeedback(prev => prev ? `${prev} ${data.transcript}` : data.transcript);
      }
    } catch (error) {
      console.error("Error transcribing:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Text-to-speech for coach response
  const speakResponse = async () => {
    if (!checkinData || isSpeaking) return;
    
    setIsSpeaking(true);
    try {
      const fullText = `${checkinData.greeting} ${checkinData.progressAcknowledgment} ${checkinData.motivation} Here's a tip for tomorrow: ${checkinData.tipForTomorrow}`;
      
      const response = await apiRequest("POST", "/api/text-to-speech", { text: fullText });
      const data = await response.json();
      
      if (data.audio) {
        const audioData = atob(data.audio);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.play();
      }
    } catch (error) {
      console.error("Error with text-to-speech:", error);
      setIsSpeaking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-coaching-checkin">
          <MessageCircle className="w-4 h-4" />
          Talk to Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
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
                variant="ghost" 
                onClick={speakResponse}
                disabled={isSpeaking}
                title="Listen to coach response"
                data-testid="button-speak-response"
              >
                <Volume2 className={cn("w-5 h-5", isSpeaking && "text-primary animate-pulse")} />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden -mx-6">
          <div ref={scrollAreaRef} className="h-full overflow-y-auto px-6 py-2">
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

            <Button onClick={handleClose} className="w-full" data-testid="button-close-checkin">
              Thanks, Coach!
            </Button>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
