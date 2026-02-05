import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Heart, MessageCircle, Send, Crown, Lock, Settings, 
  MessageSquare, Award, TrendingUp, Edit2, Check, X
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: number;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  profileVisible: boolean;
  showHabitProgress: boolean;
  allowMessages: boolean;
  allowProfileLikes: boolean;
  totalLikes: number;
  postsCount: number;
  commentsCount: number;
  firstName?: string;
  level?: number;
  xpPoints?: number;
  hasLiked?: boolean;
}

function PremiumRequired() {
  const [, navigate] = useLocation();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Crown className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Community Profiles are Premium</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Create your profile, connect with others, and share your habit journey. Upgrade to Pro or Premium to access.
      </p>
      <Button onClick={() => navigate("/paywall")} size="lg" className="gap-2" data-testid="button-upgrade-profile">
        <Lock className="w-4 h-4" />
        Upgrade to Pro
      </Button>
    </div>
  );
}

function ProfileEditor({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(profile.displayName || "");
  const [bio, setBio] = useState(profile.bio || "");
  const { toast } = useToast();

  const updateProfile = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/community/profile", { displayName, bio }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/profile"] });
      toast({ title: "Profile updated!" });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Edit Profile</span>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            data-testid="input-display-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community about yourself and your habit goals..."
            rows={4}
            data-testid="textarea-bio"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            data-testid="button-save-profile"
          >
            {updateProfile.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrivacySettings({ profile }: { profile: UserProfile }) {
  const { toast } = useToast();

  const updateSetting = useMutation({
    mutationFn: (updates: Partial<UserProfile>) => apiRequest("PATCH", "/api/community/profile", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/profile"] });
      toast({ title: "Settings updated!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Privacy Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="profileVisible">Public Profile</Label>
            <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
          </div>
          <Switch
            id="profileVisible"
            checked={profile.profileVisible}
            onCheckedChange={(checked) => updateSetting.mutate({ profileVisible: checked })}
            data-testid="switch-profile-visible"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="allowMessages">Allow Messages</Label>
            <p className="text-sm text-muted-foreground">Let others send you direct messages</p>
          </div>
          <Switch
            id="allowMessages"
            checked={profile.allowMessages}
            onCheckedChange={(checked) => updateSetting.mutate({ allowMessages: checked })}
            data-testid="switch-allow-messages"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="allowProfileLikes">Allow Profile Likes</Label>
            <p className="text-sm text-muted-foreground">Let others like your profile</p>
          </div>
          <Switch
            id="allowProfileLikes"
            checked={profile.allowProfileLikes}
            onCheckedChange={(checked) => updateSetting.mutate({ allowProfileLikes: checked })}
            data-testid="switch-allow-likes"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="showHabitProgress">Show Habit Progress</Label>
            <p className="text-sm text-muted-foreground">Display your habit stats on your profile</p>
          </div>
          <Switch
            id="showHabitProgress"
            checked={profile.showHabitProgress}
            onCheckedChange={(checked) => updateSetting.mutate({ showHabitProgress: checked })}
            data-testid="switch-show-progress"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [, navigate] = useLocation();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/community/profile"],
    retry: false,
  });

  const isPremiumError = (error as any)?.message?.includes("PREMIUM_REQUIRED");

  if (isPremiumError) {
    return <PremiumRequired />;
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!profile) {
    return <PremiumRequired />;
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/community")} className="gap-2" data-testid="button-back-community">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Community</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-bold">My Profile</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Manage your community presence</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {isEditing ? (
            <ProfileEditor profile={profile} onClose={() => setIsEditing(false)} />
          ) : (
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
                  <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto md:mx-0">
                    <AvatarImage src={profile.avatarUrl || undefined} />
                    <AvatarFallback className="text-xl md:text-2xl">{profile.displayName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                      <div>
                        <h2 className="text-xl md:text-2xl font-bold">{profile.displayName || "Anonymous"}</h2>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                          <Badge variant="secondary">Level {profile.level || 1}</Badge>
                          <span className="text-sm text-muted-foreground">{profile.xpPoints || 0} XP</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2 mx-auto md:mx-0" data-testid="button-edit-profile">
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </div>
                    <p className="mt-4 text-muted-foreground text-sm md:text-base">
                      {profile.bio || "No bio yet. Tell the community about yourself!"}
                    </p>
                    <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-bold">{profile.totalLikes}</p>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <Heart className="w-3 h-3" /> Likes
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-bold">{profile.postsCount}</p>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <MessageSquare className="w-3 h-3" /> Posts
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl md:text-2xl font-bold">{profile.commentsCount}</p>
                        <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Comments
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettings profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PublicProfile({ userId }: { userId: string }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/community/profile", userId],
    retry: false,
  });

  const likeProfile = useMutation({
    mutationFn: () => apiRequest("POST", `/api/community/profile/${userId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/profile", userId] });
    },
  });

  const startConversation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/community/messages", { recipientId: userId, content: "Hi!" }),
    onSuccess: (data: any) => {
      navigate(`/community/messages`);
      toast({ title: "Message sent!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Cannot message", 
        description: error.message || "This user has messaging disabled",
        variant: "destructive" 
      });
    },
  });

  const isPremiumError = (error as any)?.message?.includes("PREMIUM_REQUIRED");

  if (isPremiumError) {
    return <PremiumRequired />;
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile Not Found</h1>
        </div>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">This profile doesn't exist or is private.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-2" data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Profile</h1>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto md:mx-0">
              <AvatarImage src={profile.avatarUrl || undefined} />
              <AvatarFallback className="text-xl md:text-2xl">{profile.displayName?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">{profile.displayName || "Anonymous"}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                    <Badge variant="secondary">Level {profile.level || 1}</Badge>
                    <span className="text-sm text-muted-foreground">{profile.xpPoints || 0} XP</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-center md:justify-start">
                  {profile.allowProfileLikes && (
                    <Button 
                      variant={profile.hasLiked ? "default" : "outline"} 
                      size="sm"
                      onClick={() => likeProfile.mutate()}
                      className="gap-2"
                      data-testid="button-like-profile"
                    >
                      <Heart className={`w-4 h-4 ${profile.hasLiked ? "fill-current" : ""}`} />
                      {profile.totalLikes}
                    </Button>
                  )}
                  {profile.allowMessages && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startConversation.mutate()}
                      disabled={startConversation.isPending}
                      className="gap-2"
                      data-testid="button-message-user"
                    >
                      <Send className="w-4 h-4" />
                      Message
                    </Button>
                  )}
                </div>
              </div>
              {profile.bio && (
                <p className="mt-4 text-muted-foreground text-sm md:text-base">{profile.bio}</p>
              )}
              <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t">
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold">{profile.totalLikes}</p>
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Heart className="w-3 h-3" /> Likes
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold">{profile.postsCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Posts
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl md:text-2xl font-bold">{profile.commentsCount}</p>
                  <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Comments
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserProfile() {
  const params = useParams<{ userId?: string }>();
  
  if (params.userId) {
    return <PublicProfile userId={params.userId} />;
  }
  
  return <MyProfile />;
}
