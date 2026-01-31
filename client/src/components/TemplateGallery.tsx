import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Sunrise, Dumbbell, BookOpen, Brain, Apple, PenTool, GraduationCap, 
  Smartphone, Moon, Heart, Target, Loader2, Plus, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import type { HabitTemplate } from "@shared/schema";

const iconMap: Record<string, typeof Target> = {
  Sunrise,
  Dumbbell,
  BookOpen,
  Brain,
  Apple,
  PenTool,
  GraduationCap,
  Smartphone,
  Moon,
  Heart,
  Target,
};

interface TemplateGalleryProps {
  onSelectTemplate: (template: HabitTemplate) => void;
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: templates, isLoading } = useQuery<HabitTemplate[]>({
    queryKey: ['/api/templates'],
  });
  
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest('POST', `/api/templates/${templateId}/use`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
    },
  });
  
  const handleSelectTemplate = (template: HabitTemplate) => {
    useTemplateMutation.mutate(template.id);
    onSelectTemplate(template);
    setIsOpen(false);
  };
  
  const groupedTemplates = templates?.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(template);
    return acc;
  }, {} as Record<string, HabitTemplate[]>) || {};
  
  const categoryLabels: Record<string, string> = {
    wellness: "Wellness & Mindfulness",
    health: "Health & Fitness",
    learning: "Learning & Growth",
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="button-browse-templates">
          <Target className="w-4 h-4" />
          Browse Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Habit Templates</DialogTitle>
          <DialogDescription>
            Choose a template to get started quickly with pre-configured habits
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => (
              <div key={category}>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                  {categoryLabels[category] || category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryTemplates.map((template, index) => {
                    const Icon = iconMap[template.icon || 'Target'] || Target;
                    
                    return (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="hover-elevate cursor-pointer group"
                          onClick={() => handleSelectTemplate(template)}
                          data-testid={`template-card-${template.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg bg-${template.color || 'primary'}/20 flex items-center justify-center`}>
                                <Icon className={`w-5 h-5 text-${template.color || 'primary'}`} />
                              </div>
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {template.name}
                                  {template.isPremium && (
                                    <Badge variant="secondary" className="text-xs">Premium</Badge>
                                  )}
                                </CardTitle>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                            {template.usageCount && template.usageCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Used by {template.usageCount} people
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {(!templates || templates.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates available yet.</p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
