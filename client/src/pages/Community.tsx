import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  MessageCircle, TrendingUp, Lightbulb, Users, HelpCircle, 
  Heart, MessageSquare, Plus, ArrowLeft, Send, Crown, Lock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { usePageTitle } from "@/hooks/use-page-title";

const categoryIcons: Record<string, any> = {
  TrendingUp,
  Lightbulb,
  Users,
  HelpCircle,
  MessageCircle,
};

interface ForumCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  postsCount: number;
}

interface ForumPost {
  id: number;
  title: string;
  content: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: { displayName: string; avatarUrl: string | null } | null;
  category?: ForumCategory;
  hasLiked?: boolean;
}

interface ForumComment {
  id: number;
  content: string;
  likesCount: number;
  createdAt: string;
  author: { userId: string; displayName: string; avatarUrl: string | null } | null;
  hasLiked: boolean;
}

function PremiumRequired() {
  const [, navigate] = useLocation();
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Crown className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-3">Community is a Premium Feature</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Connect with other habit builders, share your progress, get tips, and find accountability partners. Upgrade to Pro or Premium to access the community.
      </p>
      <Button onClick={() => navigate("/paywall")} size="lg" className="gap-2" data-testid="button-upgrade-community">
        <Lock className="w-4 h-4" />
        Upgrade to Pro
      </Button>
    </div>
  );
}

function ProReadOnlyBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card className="bg-primary/5 border-primary/20 mb-6">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-primary" />
          <div>
            <p className="font-medium">You're viewing in read-only mode</p>
            <p className="text-sm text-muted-foreground">Upgrade to Premium to post, comment, like, and message</p>
          </div>
        </div>
        <Button onClick={onUpgrade} size="sm" className="gap-2" data-testid="button-upgrade-to-premium">
          <Crown className="w-4 h-4" />
          Upgrade to Premium
        </Button>
      </CardContent>
    </Card>
  );
}

function CategoryList({ onSelectCategory }: { onSelectCategory: (slug: string) => void }) {
  const { data: categories, isLoading } = useQuery<ForumCategory[]>({
    queryKey: ["/api/community/categories"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {categories?.map((category) => {
        const IconComponent = categoryIcons[category.icon] || MessageCircle;
        return (
          <Card 
            key={category.id} 
            className="cursor-pointer hover-elevate transition-all"
            onClick={() => onSelectCategory(category.slug)}
            data-testid={`card-category-${category.slug}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{category.postsCount} posts</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{category.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function RecentPosts() {
  const [, navigate] = useLocation();
  const { data: posts, isLoading } = useQuery<ForumPost[]>({
    queryKey: ["/api/community/recent-posts"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <Card className="p-8 text-center">
        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No posts yet. Be the first to start a conversation!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card 
          key={post.id} 
          className="cursor-pointer hover-elevate"
          onClick={() => navigate(`/community/post/${post.id}`)}
          data-testid={`card-post-${post.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={post.author?.avatarUrl || undefined} />
                <AvatarFallback>{post.author?.displayName?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium truncate">{post.title}</h4>
                  {post.category && (
                    <Badge variant="secondary" className="text-xs">{post.category.name}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{post.author?.displayName || "Anonymous"}</span>
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {post.likesCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {post.commentsCount}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoryPosts({ slug, onBack, isReadOnly = false }: { slug: string; onBack: () => void; isReadOnly?: boolean }) {
  const [, navigate] = useLocation();
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ category: ForumCategory; posts: ForumPost[] }>({
    queryKey: ["/api/community/categories", slug, "posts"],
  });

  const createPost = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/community/posts", {
        categoryId: data?.category.id,
        title: newPostTitle,
        content: newPostContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/categories", slug, "posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/recent-posts"] });
      setShowNewPost(false);
      setNewPostTitle("");
      setNewPostContent("");
      toast({ title: "Post created!", description: "Your post has been published." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create post", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  const IconComponent = categoryIcons[data?.category.icon || "MessageCircle"] || MessageCircle;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 flex-shrink-0" data-testid="button-back-categories">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg md:text-2xl font-bold truncate">{data?.category.name}</h2>
            <p className="text-xs md:text-sm text-muted-foreground truncate">{data?.category.description}</p>
          </div>
        </div>
      </div>

      {!isReadOnly && (
        <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-new-post">
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Post title"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              data-testid="input-post-title"
            />
            <Textarea
              placeholder="Share your thoughts, tips, or questions..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={6}
              data-testid="textarea-post-content"
            />
            <Button 
              onClick={() => createPost.mutate()} 
              disabled={!newPostTitle.trim() || !newPostContent.trim() || createPost.isPending}
              className="w-full"
              data-testid="button-submit-post"
            >
              {createPost.isPending ? "Posting..." : "Post"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      )}

      {!data?.posts.length ? (
        <Card className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No posts in this category yet. Be the first!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.posts.map((post) => (
            <Card 
              key={post.id} 
              className="cursor-pointer hover-elevate"
              onClick={() => navigate(`/community/post/${post.id}`)}
              data-testid={`card-post-${post.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={post.author?.avatarUrl || undefined} />
                    <AvatarFallback>{post.author?.displayName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{post.author?.displayName || "Anonymous"}</span>
                      <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" /> {post.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" /> {post.commentsCount}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PostDetail({ postId, onBack, isReadOnly = false }: { postId: number; onBack: () => void; isReadOnly?: boolean }) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: post, isLoading } = useQuery<ForumPost & { comments: ForumComment[]; category: ForumCategory }>({
    queryKey: ["/api/community/posts", postId],
  });

  const likePost = useMutation({
    mutationFn: () => apiRequest("POST", `/api/community/posts/${postId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId] });
    },
  });

  const likeComment = useMutation({
    mutationFn: (commentId: number) => apiRequest("POST", `/api/community/comments/${commentId}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId] });
    },
  });

  const addComment = useMutation({
    mutationFn: () => apiRequest("POST", `/api/community/posts/${postId}/comments`, { content: newComment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts", postId] });
      setNewComment("");
      toast({ title: "Comment added!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (!post) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Post not found</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2" data-testid="button-back-category">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>
        <Badge variant="secondary">{post.category?.name}</Badge>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar 
              className="w-12 h-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => post.author && navigate(`/community/profile/${(post as any).author?.userId}`)}
            >
              <AvatarImage src={post.author?.avatarUrl || undefined} />
              <AvatarFallback>{post.author?.displayName?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-xl font-bold mb-2">{post.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span className="font-medium text-foreground">{post.author?.displayName || "Anonymous"}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
              <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
              <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                {isReadOnly ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span>{post.likesCount}</span>
                  </div>
                ) : (
                  <Button 
                    variant={post.hasLiked ? "default" : "outline"} 
                    size="sm"
                    onClick={() => likePost.mutate()}
                    className="gap-2"
                    data-testid="button-like-post"
                  >
                    <Heart className={`w-4 h-4 ${post.hasLiked ? "fill-current" : ""}`} />
                    {post.likesCount}
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold">Comments</h3>
        
        {!isReadOnly && (
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  data-testid="textarea-comment"
                />
                <Button 
                  size="icon"
                  onClick={() => addComment.mutate()}
                  disabled={!newComment.trim() || addComment.isPending}
                  data-testid="button-submit-comment"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {post.comments?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to comment!</p>
        ) : (
          <div className="space-y-3">
            {post.comments?.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar 
                      className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => comment.author && navigate(`/community/profile/${comment.author.userId}`)}
                    >
                      <AvatarImage src={comment.author?.avatarUrl || undefined} />
                      <AvatarFallback>{comment.author?.displayName?.[0] || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{comment.author?.displayName || "Anonymous"}</span>
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      {isReadOnly ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <Heart className="w-3 h-3" />
                          <span>{comment.likesCount}</span>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => likeComment.mutate(comment.id)}
                          className="gap-1 h-7 px-2 mt-2"
                          data-testid={`button-like-comment-${comment.id}`}
                        >
                          <Heart className={`w-3 h-3 ${comment.hasLiked ? "fill-current text-red-500" : ""}`} />
                          <span className="text-xs">{comment.likesCount}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Community() {
  usePageTitle("Community");
  const [location, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isPro, isPremium } = useSubscription();

  const { data: categories, isLoading, error } = useQuery<ForumCategory[]>({
    queryKey: ["/api/community/categories"],
    retry: false,
  });

  const isPremiumError = (error as any)?.message?.includes("PREMIUM_REQUIRED") || 
                         (error as any)?.code === "PREMIUM_REQUIRED";

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Skeleton className="h-12 w-48 mb-6" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isPremiumError || error) {
    return <PremiumRequired />;
  }

  const isProOnly = isPro && !isPremium;

  const pathParts = location.split("/");
  const postId = pathParts[2] === "post" ? parseInt(pathParts[3]) : null;

  if (postId) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        {isProOnly && <ProReadOnlyBanner onUpgrade={() => navigate("/paywall")} />}
        <PostDetail postId={postId} onBack={() => window.history.back()} isReadOnly={isProOnly} />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6">
      {isProOnly && <ProReadOnlyBanner onUpgrade={() => navigate("/paywall")} />}
      
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2" data-testid="button-back-dashboard">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold">Community</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Connect with fellow habit builders</p>
        </div>
        {isPremium && (
          <div className="flex items-center gap-2">
            <Link href="/community/messages">
              <Button variant="outline" size="icon" className="md:hidden" data-testid="button-messages-mobile">
                <MessageCircle className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="gap-2 hidden md:flex" data-testid="button-messages">
                <MessageCircle className="w-4 h-4" />
                Messages
              </Button>
            </Link>
            <Link href="/community/profile">
              <Button variant="outline" size="sm" className="gap-1 text-xs md:text-sm md:gap-2" data-testid="button-my-profile">
                My Profile
              </Button>
            </Link>
          </div>
        )}
      </div>

      {selectedCategory ? (
        <CategoryPosts slug={selectedCategory} onBack={() => setSelectedCategory(null)} isReadOnly={isProOnly} />
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Categories</h2>
            <CategoryList onSelectCategory={setSelectedCategory} />
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <RecentPosts />
          </section>
        </div>
      )}
    </div>
  );
}
