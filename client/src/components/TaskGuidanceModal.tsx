import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Lightbulb, 
  BookOpen, 
  Wrench, 
  Video, 
  FileText, 
  ExternalLink, 
  Loader2,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Globe,
  BookMarked,
  ClipboardList,
  Download,
  Play,
  Star,
  ArrowRight,
  Edit2,
  Save,
  X,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineTask } from "@shared/schema";
import { jsPDF } from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useSubscription } from "@/hooks/use-subscription";
import { Crown, Lock } from "lucide-react";

const LOADING_MESSAGES = [
  "Searching for expert tips...",
  "Finding helpful tools & apps...",
  "Looking up video tutorials...",
  "Creating downloadable templates...",
  "Gathering step-by-step examples...",
  "Curating the best resources...",
  "Almost ready...",
];

function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
    }, 600);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="font-semibold text-lg">Your AI Coach is Working</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground h-5"
          >
            {LOADING_MESSAGES[messageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-48 space-y-2">
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-center">
          This may take 10-20 seconds
        </p>
      </div>
    </div>
  );
}

interface VideoSuggestion {
  title: string;
  searchQuery: string;
  videoId?: string;
  channel?: string;
  duration?: string;
}

interface ToolResource {
  id: string;
  name: string;
  type: string;
  description: string;
  url?: string;
  features?: string[];
  pricing?: string;
}

interface Template {
  title: string;
  content: string;
  format: string;
}

interface GuidanceData {
  examples: string[];
  tips: string[];
  tools: ToolResource[];
  templates: Template[];
  videos: VideoSuggestion[];
}

interface TaskGuidanceModalProps {
  habitId: number;
  task: RoutineTask;
  habitTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const resourceIcons: Record<string, React.ReactNode> = {
  app: <Smartphone className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  tool: <Wrench className="w-4 h-4" />,
  book: <BookMarked className="w-4 h-4" />,
  template: <ClipboardList className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  software: <Globe className="w-4 h-4" />,
  service: <Star className="w-4 h-4" />,
};

interface SavedTemplate {
  id: number;
  title: string;
  content: string;
  originalTitle?: string;
  taskId?: string;
}

export function TaskGuidanceModal({ habitId, task, habitTitle, open, onOpenChange }: TaskGuidanceModalProps) {
  const [guidance, setGuidance] = useState<GuidanceData | null>(null);
  const [activeTab, setActiveTab] = useState("examples");
  const [editingTemplate, setEditingTemplate] = useState<{id?: number; title: string; content: string; originalTitle: string} | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [showSavedTemplates, setShowSavedTemplates] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isPremium, canUseFeature, getUpgradeMessage } = useSubscription();
  
  const hasEditableTemplates = canUseFeature('hasEditableTemplates');
  const hasDownloadablePdf = canUseFeature('hasDownloadablePdf');

  // Fetch user's saved templates for this habit
  const { data: savedTemplates = [] } = useQuery<SavedTemplate[]>({
    queryKey: ['/api/user-templates', habitId],
    queryFn: async () => {
      const res = await fetch(`/api/user-templates?habitId=${habitId}`);
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
    enabled: open && showSavedTemplates,
  });

  // Create new template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; originalTitle: string }) => {
      const res = await apiRequest("POST", "/api/user-templates", {
        habitId,
        title: data.title,
        content: data.content,
        originalTitle: data.originalTitle,
        taskId: task.id,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template saved!", description: "Your template has been saved to your account." });
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['/api/user-templates', habitId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template. Please try again.", variant: "destructive" });
    },
  });

  // Update existing template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: number; title: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/user-templates/${data.id}`, {
        title: data.title,
        content: data.content,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template updated!", description: "Your changes have been saved." });
      setEditingTemplate(null);
      queryClient.invalidateQueries({ queryKey: ['/api/user-templates', habitId] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template. Please try again.", variant: "destructive" });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest("DELETE", `/api/user-templates/${templateId}`);
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ['/api/user-templates', habitId] });
    },
  });

  const startEditing = (template: Template) => {
    // Editing an AI-generated template (create new)
    setEditingTemplate({ title: template.title, content: template.content, originalTitle: template.title });
    setEditedTitle(template.title);
    setEditedContent(template.content);
  };

  const startEditingSaved = (saved: SavedTemplate) => {
    // Editing an existing saved template (update)
    setEditingTemplate({ id: saved.id, title: saved.title, content: saved.content, originalTitle: saved.originalTitle || saved.title });
    setEditedTitle(saved.title);
    setEditedContent(saved.content);
  };

  const handleSaveTemplate = () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      toast({ title: "Error", description: "Title and content are required", variant: "destructive" });
      return;
    }
    
    if (editingTemplate?.id) {
      // Update existing saved template
      updateTemplateMutation.mutate({
        id: editingTemplate.id,
        title: editedTitle,
        content: editedContent,
      });
    } else {
      // Create new template
      createTemplateMutation.mutate({
        title: editedTitle,
        content: editedContent,
        originalTitle: editingTemplate?.originalTitle || editedTitle,
      });
    }
  };
  
  const isSaving = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  const guidanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/tasks/${task.id}/guidance`, {
        taskTitle: task.title,
        taskDescription: task.description,
        habitTitle: habitTitle,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGuidance(data);
    },
  });

  useEffect(() => {
    if (open && !guidance && !guidanceMutation.isPending) {
      guidanceMutation.mutate();
    }
  }, [open, guidance, guidanceMutation.isPending]);

  useEffect(() => {
    setGuidance(null);
    setActiveTab("examples");
  }, [task.id]);

  const handleVideoClick = (video: VideoSuggestion) => {
    if (video.videoId) {
      window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(video.searchQuery)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadTemplate = async (template: Template) => {
    // Create a new PDF document with fillable form fields
    const pdfDoc = await PDFDocument.create();
    const form = pdfDoc.getForm();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageWidth = 612; // Letter size
    const pageHeight = 792;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPos = pageHeight - margin;
    let fieldCount = 0;
    
    const getUniqueFieldName = (base: string) => `${base}_${fieldCount++}`;
    
    const ensureSpace = (neededSpace: number) => {
      if (yPos - neededSpace < margin + 30) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPos = pageHeight - margin;
      }
    };
    
    const drawText = (text: string, x: number, y: number, size: number = 10, color = rgb(0, 0, 0), useFont = font) => {
      page.drawText(text, { x, y, size, font: useFont, color });
    };
    
    const addTextField = (name: string, x: number, y: number, width: number, height: number = 18, multiline: boolean = false) => {
      const textField = form.createTextField(getUniqueFieldName(name));
      textField.addToPage(page, { x, y: y - height, width, height, borderWidth: 1, borderColor: rgb(0.7, 0.7, 0.7) });
      if (multiline) {
        textField.enableMultiline();
      }
      textField.setFontSize(10);
    };
    
    const addCheckbox = (name: string, x: number, y: number, label: string) => {
      const checkbox = form.createCheckBox(getUniqueFieldName(name));
      checkbox.addToPage(page, { x, y: y - 12, width: 12, height: 12, borderWidth: 1, borderColor: rgb(0.5, 0.5, 0.5) });
      drawText(label, x + 16, y - 10, 9);
    };
    
    // ============ HEADER ============
    page.drawRectangle({
      x: 0, y: pageHeight - 60, width: pageWidth, height: 60,
      color: rgb(0.13, 0.55, 0.13)
    });
    
    drawText(template.title.substring(0, 60), margin, pageHeight - 35, 16, rgb(1, 1, 1), boldFont);
    drawText(`${habitTitle} - ${task.title}`.substring(0, 80), margin, pageHeight - 52, 10, rgb(1, 1, 1));
    
    yPos = pageHeight - 80;
    
    // ============ INFO FIELDS ROW ============
    drawText("Date:", margin, yPos, 9, rgb(0.4, 0.4, 0.4), boldFont);
    addTextField("date", margin + 30, yPos + 5, 80);
    
    drawText("Week #:", margin + 130, yPos, 9, rgb(0.4, 0.4, 0.4), boldFont);
    addTextField("week", margin + 170, yPos + 5, 40);
    
    drawText("Name:", margin + 230, yPos, 9, rgb(0.4, 0.4, 0.4), boldFont);
    addTextField("name", margin + 270, yPos + 5, 150);
    
    yPos -= 35;
    
    // ============ GOAL SECTION ============
    page.drawRectangle({ x: margin, y: yPos - 50, width: contentWidth, height: 55, color: rgb(0.96, 0.98, 0.96), borderWidth: 1, borderColor: rgb(0.7, 0.82, 0.7) });
    drawText("My Goal for This Session:", margin + 10, yPos - 5, 11, rgb(0.13, 0.39, 0.13), boldFont);
    addTextField("session_goal", margin + 10, yPos - 10, contentWidth - 20, 35, true);
    yPos -= 65;
    
    // ============ PRE-SESSION CHECK-IN ============
    page.drawRectangle({ x: margin, y: yPos - 30, width: contentWidth, height: 35, color: rgb(0.98, 0.97, 0.94), borderWidth: 1, borderColor: rgb(0.9, 0.85, 0.75) });
    drawText("Pre-Session Check-in:", margin + 10, yPos - 5, 10, rgb(0.59, 0.47, 0.2), boldFont);
    
    const checkItems = ["Quiet space ready", "Phone on silent", "Water nearby", "Timer set"];
    let checkX = margin + 10;
    checkItems.forEach((item) => {
      addCheckbox("checkin", checkX, yPos - 18, item);
      checkX += 125;
    });
    yPos -= 45;
    
    // ============ TEMPLATE CONTENT ============
    const lines = template.content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        yPos -= 8;
        continue;
      }
      
      ensureSpace(25);
      
      // Section headers
      if (trimmedLine.endsWith(':') && trimmedLine.length < 60 && !trimmedLine.startsWith('[')) {
        yPos -= 5;
        page.drawRectangle({ x: margin, y: yPos - 15, width: contentWidth, height: 18, color: rgb(0.94, 0.97, 0.94) });
        drawText(trimmedLine, margin + 5, yPos - 10, 11, rgb(0.13, 0.39, 0.13), boldFont);
        yPos -= 22;
        continue;
      }
      
      const checkboxMatch = trimmedLine.match(/^(\[ \]|☐|\[\]|□)\s*(.+)/);
      const bulletMatch = trimmedLine.match(/^[-•]\s*(.+)/);
      const numberedMatch = trimmedLine.match(/^(\d+[.)]\s*)(.+)/);
      
      if (checkboxMatch) {
        addCheckbox("task", margin, yPos, checkboxMatch[2].substring(0, 70));
        yPos -= 18;
      } else if (bulletMatch) {
        page.drawCircle({ x: margin + 5, y: yPos - 5, size: 3, color: rgb(0.13, 0.55, 0.13) });
        drawText(bulletMatch[1].substring(0, 80), margin + 12, yPos - 8, 9);
        yPos -= 14;
      } else if (numberedMatch) {
        drawText(numberedMatch[1], margin, yPos - 8, 10, rgb(0.13, 0.55, 0.13), boldFont);
        drawText(numberedMatch[2].substring(0, 75), margin + 15, yPos - 8, 9);
        yPos -= 14;
      } else if (trimmedLine.includes('[') && trimmedLine.includes(']')) {
        // Lines with placeholders become text fields
        const cleanLabel = trimmedLine.replace(/\[[^\]]+\]/g, '').trim();
        if (cleanLabel) drawText(cleanLabel.substring(0, 40), margin, yPos - 8, 9);
        addTextField("input", margin + (cleanLabel ? 150 : 0), yPos, cleanLabel ? contentWidth - 150 : contentWidth);
        yPos -= 25;
      } else {
        drawText(trimmedLine.substring(0, 90), margin, yPos - 8, 9);
        yPos -= 12;
      }
    }
    
    // ============ SESSION TRACKING ============
    ensureSpace(80);
    yPos -= 10;
    page.drawRectangle({ x: margin, y: yPos - 65, width: contentWidth, height: 70, color: rgb(0.94, 0.96, 1), borderWidth: 1, borderColor: rgb(0.7, 0.75, 0.86) });
    drawText("Session Tracking", margin + 10, yPos - 10, 11, rgb(0.2, 0.27, 0.47), boldFont);
    
    drawText("Start Time:", margin + 10, yPos - 30, 9, rgb(0.3, 0.3, 0.3));
    addTextField("start_time", margin + 70, yPos - 25, 60);
    
    drawText("End Time:", margin + 150, yPos - 30, 9, rgb(0.3, 0.3, 0.3));
    addTextField("end_time", margin + 200, yPos - 25, 60);
    
    drawText("Duration:", margin + 280, yPos - 30, 9, rgb(0.3, 0.3, 0.3));
    addTextField("duration", margin + 330, yPos - 25, 50);
    drawText("min", margin + 385, yPos - 30, 9, rgb(0.3, 0.3, 0.3));
    
    drawText("Focus (1-10):", margin + 10, yPos - 55, 9, rgb(0.3, 0.3, 0.3));
    addTextField("focus", margin + 80, yPos - 50, 30);
    
    drawText("Energy (1-10):", margin + 130, yPos - 55, 9, rgb(0.3, 0.3, 0.3));
    addTextField("energy", margin + 205, yPos - 50, 30);
    
    drawText("Distractions:", margin + 260, yPos - 55, 9, rgb(0.3, 0.3, 0.3));
    addTextField("distractions", margin + 330, yPos - 50, 100);
    
    yPos -= 85;
    
    // ============ REFLECTION SECTION ============
    ensureSpace(100);
    page.drawRectangle({ x: margin, y: yPos - 90, width: contentWidth, height: 95, color: rgb(1, 0.98, 0.96), borderWidth: 1, borderColor: rgb(0.86, 0.78, 0.7) });
    drawText("Post-Session Reflection", margin + 10, yPos - 10, 11, rgb(0.59, 0.39, 0.2), boldFont);
    
    drawText("What went well?", margin + 10, yPos - 28, 9, rgb(0.3, 0.3, 0.3));
    addTextField("went_well", margin + 10, yPos - 30, contentWidth - 20, 22, true);
    
    drawText("What could be improved?", margin + 10, yPos - 62, 9, rgb(0.3, 0.3, 0.3));
    addTextField("improve", margin + 10, yPos - 64, contentWidth - 20, 22, true);
    
    yPos -= 110;
    
    // ============ NEXT STEPS & NOTES ============
    ensureSpace(80);
    const halfWidth = (contentWidth - 10) / 2;
    
    page.drawRectangle({ x: margin, y: yPos - 70, width: halfWidth, height: 75, color: rgb(0.96, 1, 0.96), borderWidth: 1, borderColor: rgb(0.7, 0.82, 0.7) });
    drawText("Next Steps / Action Items:", margin + 5, yPos - 10, 10, rgb(0.13, 0.39, 0.13), boldFont);
    addTextField("next_steps", margin + 5, yPos - 15, halfWidth - 10, 50, true);
    
    page.drawRectangle({ x: margin + halfWidth + 10, y: yPos - 70, width: halfWidth, height: 75, color: rgb(0.98, 0.98, 0.98), borderWidth: 1, borderColor: rgb(0.78, 0.78, 0.78) });
    drawText("Additional Notes:", margin + halfWidth + 15, yPos - 10, 10, rgb(0.4, 0.4, 0.4), boldFont);
    addTextField("notes", margin + halfWidth + 15, yPos - 15, halfWidth - 10, 50, true);
    
    // ============ FOOTER ============
    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
    lastPage.drawText("Created with Habit Builder - Your Personal Habit Coach", { x: margin, y: 20, size: 7, font, color: rgb(0.6, 0.6, 0.6) });
    lastPage.drawText(new Date().toLocaleDateString(), { x: pageWidth - margin - 60, y: 20, size: 7, font, color: rgb(0.6, 0.6, 0.6) });
    
    // Save and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_worksheet.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Fillable PDF Downloaded",
      description: "You can type directly into the form fields in any PDF reader!",
    });
  };

  const copyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.content);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span>Smart Guidance & Resources</span>
              <span className="text-sm font-normal text-muted-foreground truncate max-w-[400px]">
                {task.title}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {(guidanceMutation.isPending || (!guidance && !guidanceMutation.isError)) ? (
          <LoadingState />
        ) : guidanceMutation.isError ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">Couldn't Load Resources</h3>
              <p className="text-sm text-muted-foreground">
                There was a problem getting guidance. Please try again.
              </p>
            </div>
            <Button onClick={() => guidanceMutation.mutate()} data-testid="button-retry-guidance">
              Try Again
            </Button>
          </div>
        ) : guidance ? (
          <ScrollArea className="flex-1 -mx-6 px-6 overflow-y-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="examples" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-examples">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Examples</span>
                </TabsTrigger>
                <TabsTrigger value="tips" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-tips">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tips</span>
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-tools">
                  <Wrench className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tools</span>
                </TabsTrigger>
                <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-templates">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Templates</span>
                </TabsTrigger>
                <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-videos">
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Videos</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="examples" className="space-y-4 mt-0">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Star className="w-4 h-4 text-primary" />
                    Step-by-step examples showing exactly how to do this
                  </p>
                </div>
                {guidance.examples?.map((example, index) => (
                  <Card key={index} className="bg-primary/5" data-testid={`card-example-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary-foreground">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed" data-testid={`text-example-${index}`}>{example}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="tips" className="space-y-4 mt-0">
                <div className="bg-green-500/5 rounded-lg p-4 border border-green-500/10">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Expert coaching tips to maximize your success
                  </p>
                </div>
                {guidance.tips?.map((tip, index) => (
                  <Card key={index} className="bg-gradient-to-r from-green-500/5 to-transparent" data-testid={`card-tip-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <p className="text-sm leading-relaxed" data-testid={`text-tip-${index}`}>{tip}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="tools" className="space-y-4 mt-0">
                <div className="bg-blue-500/5 rounded-lg p-4 border border-blue-500/10">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-blue-500" />
                    Recommended apps, websites, and tools to help you
                  </p>
                </div>
                <div className="grid gap-4">
                  {guidance.tools?.map((tool, index) => (
                    <Card key={index} className="hover-elevate overflow-visible" data-testid={`card-tool-${index}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                            {resourceIcons[tool.type] || <Globe className="w-6 h-6 text-blue-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold" data-testid={`text-tool-name-${index}`}>{tool.name}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {tool.type}
                              </Badge>
                              {tool.pricing && (
                                <Badge variant="outline" className="text-xs">
                                  {tool.pricing}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1.5">
                              {tool.description}
                            </p>
                            {tool.features && tool.features.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {tool.features.map((feature, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-normal">
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {tool.url && (
                              <a 
                                href={tool.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-primary hover:underline mt-2"
                                data-testid={`link-tool-${index}`}
                              >
                                Visit Website <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-4 mt-0">
                <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/10 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Templates and checklists
                    {!isPremium && (
                      <Badge variant="outline" className="ml-2 text-xs gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        Edit & Download: Premium
                      </Badge>
                    )}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowSavedTemplates(!showSavedTemplates)}
                    data-testid="button-show-saved-templates"
                  >
                    <FolderOpen className="w-4 h-4 mr-1" />
                    {showSavedTemplates ? "Hide Saved" : "My Saved"}
                  </Button>
                </div>

                {/* Saved Templates Section */}
                {showSavedTemplates && savedTemplates.length === 0 && (
                  <div className="text-center py-6 bg-muted/30 rounded-lg border border-dashed">
                    <FolderOpen className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No saved templates yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click "Edit & Save" on any template below to save your customized version</p>
                  </div>
                )}
                {showSavedTemplates && savedTemplates.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Your Saved Templates</p>
                    {savedTemplates.map((saved) => (
                      <Card key={saved.id} className="overflow-hidden border-primary/20" data-testid={`card-saved-template-${saved.id}`}>
                        <CardHeader className="pb-2 bg-primary/5">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Save className="w-5 h-5 text-primary" />
                              {saved.title}
                            </CardTitle>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  if (!hasEditableTemplates) {
                                    toast({ 
                                      title: "Premium Feature", 
                                      description: "Upgrade to Premium to edit saved templates",
                                    });
                                    return;
                                  }
                                  startEditingSaved(saved);
                                }}
                                data-testid={`button-edit-saved-${saved.id}`}
                              >
                                {hasEditableTemplates ? <Edit2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  if (!hasDownloadablePdf) {
                                    toast({ 
                                      title: "Premium Feature", 
                                      description: "Upgrade to Premium to download PDF worksheets",
                                    });
                                    return;
                                  }
                                  downloadTemplate({ title: saved.title, content: saved.content, format: "pdf" });
                                }}
                              >
                                {hasDownloadablePdf ? <Download className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => deleteTemplateMutation.mutate(saved.id)}
                                data-testid={`button-delete-saved-${saved.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg border overflow-x-auto max-h-40">
                            {saved.content}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Template Editor */}
                {editingTemplate && (
                  <Card className="overflow-hidden border-2 border-primary" data-testid="card-template-editor">
                    <CardHeader className="pb-2 bg-primary/10">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Edit2 className="w-5 h-5 text-primary" />
                          Edit Template
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingTemplate(null)}
                            data-testid="button-cancel-edit"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleSaveTemplate}
                            disabled={isSaving}
                            data-testid="button-save-template"
                          >
                            {isSaving ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            {editingTemplate?.id ? "Update Template" : "Save to My Templates"}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Template Title</label>
                        <Input 
                          value={editedTitle}
                          onChange={(e) => setEditedTitle(e.target.value)}
                          placeholder="Enter template title"
                          data-testid="input-template-title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Template Content</label>
                        <Textarea 
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          placeholder="Enter template content..."
                          rows={12}
                          className="font-mono text-sm"
                          data-testid="textarea-template-content"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI-Generated Templates */}
                {(!guidance.templates || guidance.templates.length === 0) && !showSavedTemplates && (
                  <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No templates available for this task</p>
                    <p className="text-xs text-muted-foreground mt-1">Templates are generated based on the task type. Try the other tabs for helpful resources!</p>
                  </div>
                )}
                {guidance.templates?.map((template, index) => (
                  <Card key={index} className="overflow-hidden" data-testid={`card-template-${index}`}>
                    <CardHeader className="pb-2 bg-muted/30">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-base flex items-center gap-2" data-testid={`text-template-title-${index}`}>
                          <FileText className="w-5 h-5 text-purple-500" />
                          {template.title}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (!hasEditableTemplates) {
                                toast({ 
                                  title: "Premium Feature", 
                                  description: "Upgrade to Premium to edit and save custom templates",
                                });
                                return;
                              }
                              startEditing(template);
                            }}
                            data-testid={`button-edit-template-${index}`}
                          >
                            {hasEditableTemplates ? (
                              <Edit2 className="w-4 h-4 mr-1" />
                            ) : (
                              <Lock className="w-4 h-4 mr-1" />
                            )}
                            Edit & Save
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyTemplate(template)}
                            data-testid={`button-copy-template-${index}`}
                          >
                            <ClipboardList className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => {
                              if (!hasDownloadablePdf) {
                                toast({ 
                                  title: "Premium Feature", 
                                  description: "Upgrade to Premium to download editable PDF worksheets",
                                });
                                return;
                              }
                              downloadTemplate(template);
                            }}
                            data-testid={`button-download-template-${index}`}
                          >
                            {hasDownloadablePdf ? (
                              <Download className="w-4 h-4 mr-1" />
                            ) : (
                              <Lock className="w-4 h-4 mr-1" />
                            )}
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-muted/50 p-4 rounded-lg border overflow-x-auto max-h-60">
                        {template.content}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="videos" className="space-y-4 mt-0">
                <div className="bg-red-500/5 rounded-lg p-4 border border-red-500/10">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Video className="w-4 h-4 text-red-500" />
                    Video tutorials to guide you step by step
                  </p>
                </div>
                {(!guidance.videos || guidance.videos.length === 0) && (
                  <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                    <Video className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No video tutorials available for this task</p>
                    <p className="text-xs text-muted-foreground mt-1">Video recommendations are generated based on the task type. Check the other tabs for more resources!</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {guidance.videos?.map((video, index) => (
                    <Card 
                      key={index} 
                      className="hover-elevate cursor-pointer overflow-hidden group"
                      onClick={() => handleVideoClick(video)}
                      data-testid={`card-video-${index}`}
                    >
                      <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-red-600/30 flex items-center justify-center">
                        {video.videoId ? (
                          <img 
                            src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-8 h-8 text-white ml-1" />
                          </div>
                        </div>
                        {video.duration && (
                          <Badge className="absolute bottom-2 right-2 bg-black/80">
                            {video.duration}
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                        {video.channel && (
                          <p className="text-xs text-muted-foreground mt-1">{video.channel}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
