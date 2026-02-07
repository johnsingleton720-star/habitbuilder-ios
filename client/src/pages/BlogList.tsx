import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Leaf, BookOpen, Clock, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link } from "wouter";
import { blogArticles } from "@/data/blog-articles";

function PublicNav() {
  return (
    <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display text-2xl font-bold text-primary" aria-label="Habit Builder - Home">
          <Leaf className="w-6 h-6 fill-primary/20" />
          <span>Habit Builder</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Link href="/templates">
            <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-templates">
              Templates
            </Button>
          </Link>
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="font-medium text-muted-foreground" data-testid="link-nav-blog">
              Blog
            </Button>
          </Link>
          <Button onClick={() => window.location.href = "/api/login"} variant="ghost" className="font-medium text-muted-foreground" data-testid="button-nav-signin">
            Sign In
          </Button>
          <Button onClick={() => window.location.href = "/api/login"} data-testid="button-nav-get-started">
            Get Started Free
          </Button>
        </div>
      </div>
    </nav>
  );
}

export default function BlogList() {
  usePageTitle("Habit Building Blog - Tips, Science, and Strategies", "Expert articles on habit formation, morning routines, habit stacking, and the science of behavior change. Learn proven techniques to build habits that stick.");

  return (
    <div className="min-h-screen bg-background font-body">
      <PublicNav />
      
      <section className="pt-24 pb-2 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Home
            </Button>
          </Link>
        </div>
      </section>

      <section className="pb-12 px-6" aria-label="Blog header">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <Badge variant="secondary" className="mb-2">
            <BookOpen className="w-3 h-3 mr-1" />
            Habit Builder Blog
          </Badge>
          <h1 className="font-display text-4xl lg:text-5xl font-bold" data-testid="text-blog-heading">
            Learn to Build Better Habits
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Science-backed articles, practical strategies, and expert tips to help you build 
            lasting habits and transform your daily routine.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6" aria-label="Blog articles">
        <div className="max-w-3xl mx-auto space-y-6">
          {blogArticles.map((article, index) => (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
            >
              <Link href={`/blog/${article.slug}`}>
                <Card className="hover-elevate cursor-pointer group" data-testid={`blog-card-${article.slug}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge variant="secondary">{article.category}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors" data-testid={`text-blog-title-${article.slug}`}>
                      {article.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">{article.excerpt}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {article.keywords.slice(0, 3).map((keyword) => (
                        <span key={keyword} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 bg-primary/5 dark:bg-primary/10" aria-label="Call to action">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold">
            Put these strategies into practice
          </h2>
          <p className="text-muted-foreground text-lg">
            Habit Builder's AI coach creates personalized action plans based on the science 
            of habit formation. Start your free trial and see the difference.
          </p>
          <Button onClick={() => window.location.href = "/api/login"} size="lg" data-testid="button-blog-cta">
            Start Your Free Trial
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <p className="text-sm text-muted-foreground">No credit card required. 2-day free trial.</p>
        </div>
      </section>

      <footer className="py-8 border-t border-border" role="contentinfo">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Habit Builder. All rights reserved.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/blog" className="text-sm font-medium text-foreground">Blog</Link>
            <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">Templates</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
