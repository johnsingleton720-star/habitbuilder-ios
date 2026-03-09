import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isIOS } from "@/lib/platform";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { BookOpen, Download, ExternalLink, FileText, Sparkles, Trash2, Save, Loader2, Edit, Plus, Search, ArrowLeft, Crown } from "lucide-react";
import type { HabitStack, Habit, UserTemplate } from "@shared/schema";

interface ExtractedResource {
  name: string;
  type: string;
  searchQuery?: string;
  description: string;
  url?: string;
  habitTitle: string;
  habitId: number;
  taskId?: string;
}

function generateTemplateContent(resource: ExtractedResource): string {
  const type = resource.type?.toLowerCase() || "";
  const header = `${resource.name}\nSource: ${resource.description}\n${"=".repeat(50)}\n\n`;

  if (type.includes("article") || type.includes("blog") || type === "website") {
    return `${header}NOTES & KEY TAKEAWAYS\n\nDate Read: ${new Date().toLocaleDateString()}\n\nKey Points:\n- \n- \n- \n\nMain Takeaways:\n1. \n2. \n3. \n\nHow I'll Apply This:\n- \n\nQuotes / Highlights:\n- \n\nRelated Resources:\n- \n`;
  }
  if (type.includes("book")) {
    return `${header}READING NOTES & ACTION ITEMS\n\nDate Started: ${new Date().toLocaleDateString()}\nDate Finished: \n\nChapter Notes:\n\nChapter 1:\n- \n\nChapter 2:\n- \n\nKey Concepts:\n1. \n2. \n3. \n\nAction Items:\n- [ ] \n- [ ] \n- [ ] \n\nFavorite Quotes:\n- \n\nOverall Rating: /5\n`;
  }
  if (type.includes("course") || type.includes("app")) {
    return `${header}COURSE PROGRESS TRACKER\n\nDate Started: ${new Date().toLocaleDateString()}\nDate Completed: \n\nModule 1:\n- Status: Not Started / In Progress / Complete\n- Notes: \n\nModule 2:\n- Status: Not Started / In Progress / Complete\n- Notes: \n\nKey Skills Learned:\n1. \n2. \n3. \n\nPractice Exercises Completed:\n- [ ] \n- [ ] \n\nNext Steps:\n- \n`;
  }
  if (type.includes("video")) {
    return `${header}WATCH NOTES & HIGHLIGHTS\n\nDate Watched: ${new Date().toLocaleDateString()}\n\nTimestamp Notes:\n00:00 - \n05:00 - \n10:00 - \n\nKey Points:\n1. \n2. \n3. \n\nAction Items:\n- [ ] \n- [ ] \n\nRelated Videos:\n- \n`;
  }

  return `${header}RESOURCE NOTES\n\nDate: ${new Date().toLocaleDateString()}\n\nSummary:\n\n\nKey Points:\n1. \n2. \n3. \n\nNotes:\n- \n- \n\nAction Items:\n- [ ] \n- [ ] \n\nAdditional Thoughts:\n\n`;
}

function extractResources(stacks: HabitStack[] | undefined, habits: Habit[] | undefined): ExtractedResource[] {
  const resources: ExtractedResource[] = [];

  if (stacks) {
    for (const stack of stacks) {
      const unifiedPlan = stack.unifiedPlan as any;
      if (unifiedPlan?.tasks) {
        for (const task of unifiedPlan.tasks) {
          const taskResources = [...(task.resources || [])];
          if (task.steps) {
            for (const step of task.steps) {
              if (step.resources && Array.isArray(step.resources)) {
                taskResources.push(...step.resources);
              }
            }
          }
          for (const r of taskResources) {
            resources.push({
              name: r.name,
              type: r.type || "resource",
              searchQuery: r.searchQuery,
              description: r.description,
              url: r.url,
              habitTitle: task.habitTitle || stack.name,
              habitId: task.habitId || 0,
              taskId: task.id,
            });
          }
        }
      }
    }
  }

  if (habits) {
    for (const habit of habits) {
      const dailyPlans = habit.dailyPlans as any[];
      if (dailyPlans) {
        for (const plan of dailyPlans) {
          if (plan.tasks) {
            for (const task of plan.tasks) {
              if (task.guidance?.resources) {
                for (const r of task.guidance.resources) {
                  const exists = resources.some(
                    (existing) => existing.name === r.name && existing.habitId === habit.id
                  );
                  if (!exists) {
                    resources.push({
                      name: r.name,
                      type: r.type || "resource",
                      description: r.description,
                      url: r.url,
                      habitTitle: habit.title,
                      habitId: habit.id,
                      taskId: task.id,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  return resources;
}

export default function Resources() {
  usePageTitle("Resource Library", "Curated resources to support your habit journey. Articles, tips, and guides on building better habits.");
  const { user } = useAuth();
  const { features, isPremium } = useSubscription();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("resources");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTemplates, setEditingTemplates] = useState<Record<number, { title: string; content: string }>>({});
  const [savingResourceName, setSavingResourceName] = useState<string | null>(null);

  const { data: stacks, isLoading: stacksLoading } = useQuery<HabitStack[]>({
    queryKey: ["/api/habit-stacks"],
    enabled: features.hasAdvancedAnalytics,
  });

  const { data: habits, isLoading: habitsLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    enabled: features.hasAdvancedAnalytics,
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<UserTemplate[]>({
    queryKey: ["/api/user-templates"],
    enabled: features.hasAdvancedAnalytics,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { habitId: number; title: string; content: string; originalTitle: string; taskId?: string }) => {
      const res = await apiRequest("POST", "/api/user-templates", {
        userId: user?.id,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-templates"] });
      toast({ title: "Template saved", description: "Your template has been saved to My Templates." });
      setActiveTab("templates");
      setSavingResourceName(null);
    },
    onError: () => {
      toast({ title: "Failed to save template", variant: "destructive" });
      setSavingResourceName(null);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { title?: string; content?: string } }) => {
      const res = await apiRequest("PATCH", `/api/user-templates/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-templates"] });
      setEditingTemplates((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({ title: "Template updated" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const handleSaveAsTemplate = (resource: ExtractedResource) => {
    setSavingResourceName(resource.name);
    const content = generateTemplateContent(resource);
    saveTemplateMutation.mutate({
      habitId: resource.habitId,
      title: resource.name,
      content,
      originalTitle: resource.name,
      taskId: resource.taskId,
    });
  };

  const handleDownload = (template: UserTemplate) => {
    const blob = new Blob([template.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const filename = `${template.title.replace(/\s+/g, "-").toLowerCase()}.txt`;
    if (isIOS()) {
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  const startEditing = (template: UserTemplate) => {
    setEditingTemplates((prev) => ({
      ...prev,
      [template.id]: { title: template.title, content: template.content },
    }));
  };

  const handleSaveEdit = (id: number) => {
    const edits = editingTemplates[id];
    if (edits) {
      updateTemplateMutation.mutate({ id, data: edits });
    }
  };

  if (!features.hasAdvancedAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-to-dashboard">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
          <Card data-testid="card-premium-paywall">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Crown className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Resource Library is a Premium Feature</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Unlock access to AI-generated resources, editable templates, and downloadable notes with a Premium subscription.
              </p>
              <Link href="/paywall">
                <Button className="gap-2" data-testid="button-upgrade-premium">
                  <Sparkles className="w-4 h-4" /> Upgrade to Premium
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allResources = extractResources(stacks, habits);
  const isLoading = stacksLoading || habitsLoading || templatesLoading;

  const filteredResources = searchQuery
    ? allResources.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.habitTitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allResources;

  const groupedResources = filteredResources.reduce<Record<string, ExtractedResource[]>>((acc, r) => {
    const key = r.habitTitle;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type.toLowerCase()) {
      case "book":
        return "default";
      case "video":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 md:p-8 font-body">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Resource Library</h1>
              <p className="text-sm text-muted-foreground">
                AI-curated resources and your personal templates
              </p>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" data-testid="loading-resources" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full" data-testid="tabs-resources">
              <TabsTrigger value="resources" className="flex-1 gap-1" data-testid="tab-ai-resources">
                <BookOpen className="w-4 h-4" /> AI Resources
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 gap-1" data-testid="tab-my-templates">
                <FileText className="w-4 h-4" /> My Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="space-y-4 mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-resources"
                />
              </div>

              {Object.keys(groupedResources).length === 0 ? (
                <Card data-testid="card-empty-resources">
                  <CardContent className="p-8 text-center space-y-3">
                    <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="font-medium">No resources found</p>
                    <p className="text-sm text-muted-foreground">
                      Resources will appear here once your habits or stacks have AI-generated action plans with recommended resources.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(groupedResources).map(([habitTitle, resources]) => (
                  <motion.div
                    key={habitTitle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide" data-testid={`text-habit-group-${habitTitle}`}>
                      {habitTitle}
                    </h3>
                    <div className="grid gap-3">
                      {resources.map((resource, idx) => (
                        <Card key={`${resource.name}-${idx}`} data-testid={`card-resource-${idx}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium" data-testid={`text-resource-name-${idx}`}>{resource.name}</p>
                                  <Badge variant={getTypeBadgeVariant(resource.type)} data-testid={`badge-resource-type-${idx}`}>
                                    {resource.type}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground" data-testid={`text-resource-desc-${idx}`}>
                                  {resource.description}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {resource.url && (
                                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="gap-1" data-testid={`button-open-resource-${idx}`}>
                                      <ExternalLink className="w-3.5 h-3.5" /> Open
                                    </Button>
                                  </a>
                                )}
                                {resource.searchQuery && !resource.url && (
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(resource.searchQuery)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="sm" className="gap-1" data-testid={`button-search-resource-${idx}`}>
                                      <ExternalLink className="w-3.5 h-3.5" /> Search
                                    </Button>
                                  </a>
                                )}
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleSaveAsTemplate(resource)}
                                  disabled={savingResourceName === resource.name}
                                  data-testid={`button-save-template-${idx}`}
                                >
                                  {savingResourceName === resource.name ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                  )}
                                  Save as Template
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-4 mt-4">
              {!templates || templates.length === 0 ? (
                <Card data-testid="card-empty-templates">
                  <CardContent className="p-8 text-center space-y-3">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                    <p className="font-medium">No templates yet</p>
                    <p className="text-sm text-muted-foreground">
                      Save resources as templates from the AI Resources tab to start building your personal library.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab("resources")}
                      className="gap-1"
                      data-testid="button-go-to-resources"
                    >
                      <BookOpen className="w-4 h-4" /> Browse Resources
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {templates.map((template) => {
                    const isEditing = !!editingTemplates[template.id];
                    const editData = editingTemplates[template.id];

                    return (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Card data-testid={`card-template-${template.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              {isEditing ? (
                                <Input
                                  value={editData.title}
                                  onChange={(e) =>
                                    setEditingTemplates((prev) => ({
                                      ...prev,
                                      [template.id]: { ...prev[template.id], title: e.target.value },
                                    }))
                                  }
                                  className="flex-1"
                                  data-testid={`input-template-title-${template.id}`}
                                />
                              ) : (
                                <CardTitle className="text-base flex-1 truncate" data-testid={`text-template-title-${template.id}`}>
                                  {template.title}
                                </CardTitle>
                              )}
                              <div className="flex items-center gap-1 shrink-0">
                                {!isEditing && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => startEditing(template)}
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDownload(template)}
                                  data-testid={`button-download-template-${template.id}`}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  disabled={deleteTemplateMutation.isPending}
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {isEditing ? (
                              <>
                                <Textarea
                                  value={editData.content}
                                  onChange={(e) =>
                                    setEditingTemplates((prev) => ({
                                      ...prev,
                                      [template.id]: { ...prev[template.id], content: e.target.value },
                                    }))
                                  }
                                  rows={12}
                                  className="font-mono text-sm"
                                  data-testid={`textarea-template-content-${template.id}`}
                                />
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleSaveEdit(template.id)}
                                    disabled={updateTemplateMutation.isPending}
                                    className="gap-1"
                                    data-testid={`button-save-edit-${template.id}`}
                                  >
                                    {updateTemplateMutation.isPending ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5" />
                                    )}
                                    Save Changes
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setEditingTemplates((prev) => {
                                        const next = { ...prev };
                                        delete next[template.id];
                                        return next;
                                      })
                                    }
                                    data-testid={`button-cancel-edit-${template.id}`}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto" data-testid={`text-template-content-${template.id}`}>
                                {template.content}
                              </pre>
                            )}
                            {template.updatedAt && (
                              <p className="text-xs text-muted-foreground" data-testid={`text-template-date-${template.id}`}>
                                Last edited: {new Date(template.updatedAt).toLocaleDateString()}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
