import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Crown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";

interface VoiceNoteProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceNote({ onTranscript, disabled }: VoiceNoteProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const { isPremium, getUpgradeMessage } = useSubscription();

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const buffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      
      const response = await apiRequest('POST', '/api/transcribe', { audio: base64 });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transcription failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.transcript) {
        onTranscript(data.transcript);
        toast({
          title: "Voice note transcribed",
          description: "Your voice note has been added to your notes.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Transcription failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    if (!isPremium) {
      toast({
        title: "Premium feature",
        description: getUpgradeMessage('hasVoiceNotes'),
        variant: "destructive",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        if (blob.size > 0) {
          transcribeMutation.mutate(blob);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice notes.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const isProcessing = transcribeMutation.isPending;

  if (!isPremium) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled
        className="gap-2 opacity-60"
        data-testid="button-voice-note-locked"
      >
        <Crown className="w-4 h-4 text-amber-500" />
        <span className="text-xs">Premium</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isProcessing}
      className="gap-2"
      data-testid="button-voice-note"
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Transcribing...</span>
        </>
      ) : isRecording ? (
        <>
          <MicOff className="w-4 h-4" />
          <span className="text-xs">Stop</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4" />
          <span className="text-xs">Voice</span>
        </>
      )}
    </Button>
  );
}
