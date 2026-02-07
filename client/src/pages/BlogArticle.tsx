import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Leaf, Clock, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/use-page-title";
import { Link, useParams } from "wouter";
import { getArticleBySlug, blogArticles } from "@/data/blog-articles";

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

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  
  usePageTitle(
    article ? `${article.title} - Habit Builder Blog` : "Article Not Found",
    article?.excerpt || "Read expert articles on habit formation and behavior change."
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!article) {
    return (
      <div className="min-h-screen bg-background font-body">
        <PublicNav />
        <div className="pt-28 px-6 text-center">
          <h1 className="font-display text-3xl font-bold mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Link href="/blog">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": article.title,
    "description": article.excerpt,
    "author": { "@type": "Organization", "name": article.author },
    "datePublished": article.publishedDate,
    "publisher": { "@type": "Organization", "name": "Habit Builder", "url": "https://habitbuilder.pro" },
    "mainEntityOfPage": `https://habitbuilder.pro/blog/${article.slug}`,
    "keywords": article.keywords.join(", "),
  };

  const faqJsonLd = article.faqs && article.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": article.faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": { "@type": "Answer", "text": faq.answer }
    }))
  } : null;

  const currentIndex = blogArticles.findIndex(a => a.slug === article.slug);
  const nextArticle = currentIndex < blogArticles.length - 1 ? blogArticles[currentIndex + 1] : null;
  const prevArticle = currentIndex > 0 ? blogArticles[currentIndex - 1] : null;

  return (
    <div className="min-h-screen bg-background font-body">
      <PublicNav />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}

      <article className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6" data-testid="link-back-blog">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Blog
          </Link>

          <motion.header
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Badge variant="secondary">{article.category}</Badge>
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(article.publishedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 leading-tight" data-testid="text-article-title">
              {article.title}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed" data-testid="text-article-excerpt">
              {article.excerpt}
            </p>
          </motion.header>

          <div className="space-y-10">
            {article.sections.map((section, index) => (
              <motion.section
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <h2 className="font-display text-xl lg:text-2xl font-bold mb-4" data-testid={`text-section-heading-${index}`}>
                  {section.heading}
                </h2>
                <div className="text-foreground/80 leading-relaxed space-y-4">
                  {section.content.split('\n\n').map((paragraph, pIndex) => (
                    <p key={pIndex}>{paragraph}</p>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

          {article.faqs && article.faqs.length > 0 && (
            <section className="mt-12 pt-8 border-t border-border" aria-label="Frequently asked questions">
              <h2 className="font-display text-xl lg:text-2xl font-bold mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {article.faqs.map((faq, index) => (
                  <Card key={index}>
                    <CardContent className="pt-5">
                      <h3 className="font-semibold mb-2" data-testid={`text-faq-question-${index}`}>{faq.question}</h3>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section className="mt-12 pt-8 border-t border-border" aria-label="Related articles">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {prevArticle && (
                <Link href={`/blog/${prevArticle.slug}`} className="flex-1">
                  <Card className="hover-elevate h-full cursor-pointer">
                    <CardContent className="pt-5 flex items-center gap-3">
                      <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Previous</p>
                        <p className="text-sm font-medium truncate">{prevArticle.title}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}
              {nextArticle && (
                <Link href={`/blog/${nextArticle.slug}`} className="flex-1">
                  <Card className="hover-elevate h-full cursor-pointer">
                    <CardContent className="pt-5 flex items-center gap-3 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Next</p>
                        <p className="text-sm font-medium truncate">{nextArticle.title}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              )}
            </div>
          </section>
        </div>
      </article>

      <section className="py-16 px-6 bg-primary/5 dark:bg-primary/10" aria-label="Call to action">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="font-display text-2xl lg:text-3xl font-bold">
            Ready to put this into practice?
          </h2>
          <p className="text-muted-foreground text-lg">
            Habit Builder's AI coach turns these strategies into personalized daily action plans. 
            Start building your habits with expert guidance.
          </p>
          <Button onClick={() => window.location.href = "/api/login"} size="lg" data-testid="button-article-cta">
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
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/templates" className="text-sm text-muted-foreground hover:text-foreground">Templates</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
