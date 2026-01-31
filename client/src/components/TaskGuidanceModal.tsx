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

  const downloadTemplate = (template: Template) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    const lineHeight = 7;
    const sectionGap = 12;
    
    // Header with colored background
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    // Title on header
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(template.title, margin, 25);
    
    // Subtitle on header
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${habitTitle} - ${task.title}`, margin, 35);
    
    // Date field
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Date: ", margin, 55);
    doc.setFont("helvetica", "normal");
    doc.setDrawColor(180);
    doc.line(margin + 15, 55, margin + 80, 55);
    
    // Name field
    doc.setFont("helvetica", "bold");
    doc.text("Name: ", margin + 95, 55);
    doc.setFont("helvetica", "normal");
    doc.line(margin + 110, 55, pageWidth - margin, 55);
    
    let yPos = 70;
    
    // Helper to check page break and return new yPos
    const ensureSpace = (neededSpace: number): number => {
      if (yPos + neededSpace > pageHeight - 30) {
        doc.addPage();
        return 25;
      }
      return yPos;
    };
    
    // Parse content and render with formatting
    const lines = template.content.split('\n');
    
    lines.forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        yPos += 4;
        return;
      }
      
      yPos = ensureSpace(lineHeight * 2);
      
      // Section headers (lines ending with :)
      if (trimmedLine.endsWith(':') && trimmedLine.length < 60 && !trimmedLine.startsWith('[')) {
        yPos += sectionGap / 2;
        yPos = ensureSpace(lineHeight + 8);
        doc.setFillColor(240, 248, 240);
        doc.roundedRect(margin - 2, yPos - 5, maxWidth + 4, 10, 2, 2, 'F');
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(34, 100, 34);
        doc.text(trimmedLine, margin, yPos);
        yPos += lineHeight + 4;
        doc.setTextColor(0);
        return;
      }
      
      // Checkbox items
      const checkboxMatch = trimmedLine.match(/^(\[ \]|☐|\[\]|□)\s*(.+)/);
      const bulletMatch = trimmedLine.match(/^[-•]\s*(.+)/);
      const numberedMatch = trimmedLine.match(/^(\d+[.)]\s*)(.+)/);
      
      if (checkboxMatch) {
        doc.setDrawColor(100);
        doc.setLineWidth(0.5);
        doc.rect(margin, yPos - 4, 4, 4);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const checkboxText = doc.splitTextToSize(checkboxMatch[2], maxWidth - 10);
        for (const textLine of checkboxText) {
          yPos = ensureSpace(lineHeight);
          doc.text(textLine, margin + 8, yPos);
          yPos += lineHeight;
        }
        yPos += 2;
      } else if (bulletMatch) {
        doc.setFillColor(34, 139, 34);
        doc.circle(margin + 2, yPos - 1.5, 1.5, 'F');
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const bulletText = doc.splitTextToSize(bulletMatch[1], maxWidth - 10);
        for (const textLine of bulletText) {
          yPos = ensureSpace(lineHeight);
          doc.text(textLine, margin + 8, yPos);
          yPos += lineHeight;
        }
        yPos += 2;
      } else if (numberedMatch) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(34, 139, 34);
        doc.text(numberedMatch[1], margin, yPos);
        
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0);
        const numText = doc.splitTextToSize(numberedMatch[2], maxWidth - 15);
        for (const textLine of numText) {
          yPos = ensureSpace(lineHeight);
          doc.text(textLine, margin + 10, yPos);
          yPos += lineHeight;
        }
        yPos += 2;
      } else if (trimmedLine.includes('[') && trimmedLine.includes(']')) {
        // Fill-in-the-blank fields - wrap long lines
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        // Split long lines first
        const wrappedLines = doc.splitTextToSize(trimmedLine, maxWidth);
        
        for (const wrappedLine of wrappedLines) {
          yPos = ensureSpace(lineHeight);
          
          if (wrappedLine.includes('[') && wrappedLine.includes(']')) {
            const parts = wrappedLine.split(/(\[[^\]]+\])/);
            let xPos = margin;
            
            for (const part of parts) {
              if (part.match(/^\[[^\]]+\]$/)) {
                const placeholderWidth = Math.min(Math.max(30, part.length * 2.5), maxWidth - (xPos - margin) - 5);
                doc.setDrawColor(150);
                doc.setLineWidth(0.3);
                doc.line(xPos, yPos + 1, xPos + placeholderWidth, yPos + 1);
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text(part.slice(1, -1), xPos + 2, yPos - 1);
                doc.setTextColor(0);
                doc.setFontSize(10);
                xPos += placeholderWidth + 2;
              } else if (part) {
                const partWidth = doc.getTextWidth(part);
                if (xPos + partWidth > pageWidth - margin) {
                  yPos += lineHeight;
                  yPos = ensureSpace(lineHeight);
                  xPos = margin;
                }
                doc.text(part, xPos, yPos);
                xPos += partWidth;
              }
            }
          } else {
            doc.text(wrappedLine, margin, yPos);
          }
          yPos += lineHeight;
        }
        yPos += 2;
      } else {
        // Regular text
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const textLines = doc.splitTextToSize(trimmedLine, maxWidth);
        for (const textLine of textLines) {
          yPos = ensureSpace(lineHeight);
          doc.text(textLine, margin, yPos);
          yPos += lineHeight;
        }
        yPos += 1;
      }
    });
    
    // Notes section at the bottom
    yPos = ensureSpace(60);
    yPos += 10;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(margin, yPos, maxWidth, 40, 3, 3, 'F');
    doc.setDrawColor(200);
    doc.roundedRect(margin, yPos, maxWidth, 40, 3, 3, 'S');
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100);
    doc.text("Notes:", margin + 5, yPos + 8);
    
    // Footer on last page
    const currentPageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "italic");
    doc.text("Created with Habit Builder - Your AI Habit Coach", margin, currentPageHeight - 10);
    doc.text(new Date().toLocaleDateString(), pageWidth - margin - 30, currentPageHeight - 10);
    
    doc.save(`${template.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.pdf`);
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
                <div className="bg-purple-500/5 rounded-lg p-4 border border-purple-500/10 flex items-center justify-between">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    Editable templates and checklists you can customize
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
                                onClick={() => startEditingSaved(saved)}
                                data-testid={`button-edit-saved-${saved.id}`}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => downloadTemplate({ title: saved.title, content: saved.content, format: "pdf" })}
                              >
                                <Download className="w-4 h-4" />
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
                            onClick={() => startEditing(template)}
                            data-testid={`button-edit-template-${index}`}
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
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
                            onClick={() => downloadTemplate(template)}
                            data-testid={`button-download-template-${index}`}
                          >
                            <Download className="w-4 h-4 mr-1" />
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
