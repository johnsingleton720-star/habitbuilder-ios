import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoutineTask, TaskGuidance, TaskResource } from "@shared/schema";

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
};

export function TaskGuidanceModal({ habitId, task, habitTitle, open, onOpenChange }: TaskGuidanceModalProps) {
  const [guidance, setGuidance] = useState<TaskGuidance | null>(null);
  const [activeTab, setActiveTab] = useState("examples");

  const guidanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/habits/${habitId}/tasks/${task.id}/guidance`);
      return res.json();
    },
    onSuccess: (data) => {
      setGuidance(data);
    },
  });

  // Trigger mutation when modal opens
  useEffect(() => {
    if (open && !guidance && !guidanceMutation.isPending) {
      guidanceMutation.mutate();
    }
  }, [open, guidance, guidanceMutation.isPending]);

  // Reset guidance when task changes
  useEffect(() => {
    setGuidance(null);
    setActiveTab("examples");
  }, [task.id]);

  const handleVideoSearch = (searchQuery: string) => {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span>Guidance & Resources</span>
              <span className="text-sm font-normal text-muted-foreground truncate max-w-[400px]">
                {task.title}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {(guidanceMutation.isPending || (!guidance && !guidanceMutation.isError)) ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Generating Personalized Guidance</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Finding the best resources and examples for your task...
              </p>
            </div>
          </div>
        ) : guidanceMutation.isError ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We couldn't load guidance for this task.
              </p>
            </div>
            <Button variant="outline" onClick={() => guidanceMutation.mutate()}>
              Try Again
            </Button>
          </div>
        ) : guidance ? (
          <ScrollArea className="flex-1 -mx-6 px-6">
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
                <TabsTrigger value="resources" className="gap-1.5 text-xs sm:text-sm" data-testid="tab-resources">
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

              <TabsContent value="examples" className="space-y-3 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Step-by-step examples showing exactly how to complete this task:
                </p>
                {guidance.examples?.map((example, index) => (
                  <Card key={index} className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{index + 1}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{example}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="tips" className="space-y-3 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Expert tips and advice to help you succeed:
                </p>
                {guidance.tips?.map((tip, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">{tip}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="resources" className="space-y-3 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Recommended tools, apps, and resources:
                </p>
                <div className="grid gap-3">
                  {guidance.resources?.map((resource: TaskResource) => (
                    <Card key={resource.id} className="hover-elevate">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            {resourceIcons[resource.type] || <Wrench className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium">{resource.name}</h4>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {resource.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {resource.description}
                            </p>
                            {resource.url && (
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                              >
                                Visit <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="templates" className="space-y-3 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Ready-to-use templates and checklists:
                </p>
                {guidance.templates?.map((template, index) => (
                  <Card key={index} className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Template {index + 1}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-background p-3 rounded-md border overflow-x-auto">
                        {template}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="videos" className="space-y-3 mt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Find helpful video tutorials on YouTube:
                </p>
                {guidance.videoSuggestions?.map((video, index) => (
                  <Card key={index} className="hover-elevate cursor-pointer" onClick={() => handleVideoSearch(video.searchQuery)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                          <Video className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Search: "{video.searchQuery}"
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
