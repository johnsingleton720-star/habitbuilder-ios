import path from "path";
import fs from "fs";

interface BlogArticleMeta {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  publishedDate: string;
  category: string;
  keywords: string[];
  sections: { heading: string; content: string }[];
  faqs?: { question: string; answer: string }[];
}

let blogArticlesCache: BlogArticleMeta[] | null = null;

function loadBlogArticles(): BlogArticleMeta[] {
  if (blogArticlesCache) return blogArticlesCache;

  try {
    const dataPath = path.resolve(import.meta.dirname, "blogData.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    blogArticlesCache = JSON.parse(raw);
    return blogArticlesCache!;
  } catch {
    return [];
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function jsonLdTag(obj: Record<string, any>): string {
  return `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
}

const BASE_URL = "https://habitbuilder.pro";

const NAV_LINKS = `
<nav>
  <a href="/">Home</a> |
  <a href="/templates">Habit Templates</a> |
  <a href="/blog">Blog</a> |
  <a href="/about">About</a> |
  <a href="/api/login">Sign In</a>
</nav>`;

function getHomepageSeo(): { meta: string; schemas: string; noscript: string } {
  const meta = `
    <meta name="description" content="Build lasting habits with AI-powered coaching. Get personalized daily action plans, guided sessions, streak tracking, XP leveling, and progress analytics. 1 habit free forever." />
    <meta property="og:title" content="HabitBuilder.pro - AI-Powered Habit Coaching App | Build Habits That Stick" />
    <meta property="og:description" content="Your personal AI coach creates custom action plans, guided sessions, streak tracking, and XP leveling. Start free today." />
    <meta property="og:url" content="${BASE_URL}/" />
    <link rel="canonical" href="${BASE_URL}/" />`;

  const schemas = [
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "HabitBuilder.pro",
      url: BASE_URL,
      description: "Build lasting habits with AI-powered coaching. Personalized daily action plans, guided sessions, streak tracking, and progress analytics.",
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/blog?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    }),
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "HabitBuilder.pro",
      url: BASE_URL,
      logo: `${BASE_URL}/icon-192.png`,
      description: "AI-powered habit coaching application grounded in behavioral science by BJ Fogg, James Clear, and Charles Duhigg.",
      founder: {
        "@type": "Person",
        name: "Johnny B Sharp",
        jobTitle: "Founder",
        address: { "@type": "PostalAddress", addressLocality: "Dallas", addressRegion: "TX", addressCountry: "US" }
      },
      contactPoint: { "@type": "ContactPoint", email: "admin@habitbuilder.pro", contactType: "customer service" },
      sameAs: ["https://www.instagram.com/habitbuilder.pro"]
    }),
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Is HabitBuilder really free to start?", acceptedAnswer: { "@type": "Answer", text: "Yes! The free plan gives you 1 habit with full AI coaching, personalized action plans, streaks, and access to the template library. No credit card required. You can upgrade anytime if you want unlimited habits and advanced features." }},
        { "@type": "Question", name: "How does the AI coaching work?", acceptedAnswer: { "@type": "Answer", text: "When you create a habit, our AI conducts a short interview to understand your goals, schedule, and experience level. Based on your answers, it generates a personalized daily, weekly, and monthly action plan grounded in behavioral science." }},
        { "@type": "Question", name: "Can I cancel my subscription anytime?", acceptedAnswer: { "@type": "Answer", text: "Absolutely. You can cancel your Pro or Premium subscription at any time from your account settings. You'll keep access to your paid features until the end of your billing period, and your data is never deleted." }},
        { "@type": "Question", name: "Is my data private and secure?", acceptedAnswer: { "@type": "Answer", text: "Your privacy is a priority. All data is encrypted and stored securely. We use Stripe for payment processing, so we never see or store your card details." }},
        { "@type": "Question", name: "What's the difference between Pro and Premium?", acceptedAnswer: { "@type": "Answer", text: "Pro ($6/month) gives you unlimited habits, guided sessions, achievements, and weekly reports. Premium ($15/month) adds AI Coach Chat, advanced analytics, habit stacking with unified routines, accountability partners, voice notes, and CSV data export." }},
        { "@type": "Question", name: "Does it work on mobile?", acceptedAnswer: { "@type": "Answer", text: "Yes! HabitBuilder works on any device with a web browser. You can also install it as an app on your phone for a native-like experience with home screen access and offline support." }}
      ]
    })
  ].join("\n");

  const noscript = `<noscript>
    ${NAV_LINKS}
    <h1>HabitBuilder.pro - AI-Powered Habit Coaching</h1>
    <p>Build lasting habits with personalized AI coaching. Get daily action plans, guided sessions with timers, streak tracking, XP leveling, and progress analytics. Grounded in behavioral science from BJ Fogg, James Clear, and Charles Duhigg.</p>
    <h2>Pricing</h2>
    <ul>
      <li>Free: 1 habit forever with AI coaching, personalized plans, and streak tracking</li>
      <li>Pro ($6/month): Unlimited habits, guided sessions, achievements, weekly reports</li>
      <li>Premium ($15/month): Advanced analytics, AI Coach Chat, habit stacking, accountability partners</li>
    </ul>
    <h2>Features</h2>
    <ul>
      <li>AI-powered personalized habit coaching interview</li>
      <li>Daily, weekly, and monthly action plans</li>
      <li>Guided coaching sessions with built-in timers</li>
      <li>Streak tracking and daily challenges</li>
      <li>XP and 12-level gamification system</li>
      <li>Progress analytics and trend charts</li>
      <li>Habit template library</li>
      <li>Community forum and accountability partners</li>
    </ul>
    <p><a href="/templates">Browse Habit Templates</a> | <a href="/blog">Read Our Blog</a> | <a href="/about">About Us</a></p>
  </noscript>`;

  return { meta, schemas, noscript };
}

function getAboutSeo(): { meta: string; schemas: string; noscript: string } {
  const meta = `
    <title>About HabitBuilder.pro - AI-Powered Habit Coaching | Meet the Founder</title>
    <meta name="description" content="Learn about HabitBuilder.pro, founded by Johnny B Sharp in Dallas, Texas. Our AI-powered habit coaching app combines personalized plans with behavioral science from BJ Fogg, James Clear, and Charles Duhigg." />
    <meta property="og:title" content="About HabitBuilder.pro - Meet the Founder" />
    <meta property="og:description" content="Built in Dallas, Texas by Johnny B Sharp. AI-powered habit coaching grounded in behavioral science." />
    <meta property="og:url" content="${BASE_URL}/about" />
    <link rel="canonical" href="${BASE_URL}/about" />`;

  const schemas = [
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "HabitBuilder.pro",
      url: BASE_URL,
      description: "AI-powered habit coaching application that creates personalized action plans grounded in behavioral science.",
      founder: {
        "@type": "Person",
        name: "Johnny B Sharp",
        jobTitle: "Founder & Developer",
        address: { "@type": "PostalAddress", addressLocality: "Dallas", addressRegion: "TX", addressCountry: "US" }
      },
      sameAs: ["https://www.instagram.com/habitbuilder.pro"],
      contactPoint: { "@type": "ContactPoint", email: "admin@habitbuilder.pro", contactType: "customer service" }
    }),
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Johnny B Sharp",
      jobTitle: "Founder & Developer",
      url: `${BASE_URL}/about`,
      worksFor: { "@type": "Organization", name: "HabitBuilder.pro", url: BASE_URL },
      address: { "@type": "PostalAddress", addressLocality: "Dallas", addressRegion: "TX", addressCountry: "US" }
    })
  ].join("\n");

  const noscript = `<noscript>
    ${NAV_LINKS}
    <h1>About HabitBuilder.pro</h1>
    <h2>Our Mission</h2>
    <p>We believe everyone deserves a personal coach for building better habits. HabitBuilder.pro combines AI-powered personalization with proven behavioral science frameworks from researchers like BJ Fogg, James Clear, and Charles Duhigg.</p>
    <h2>Founder</h2>
    <p>Johnny B Sharp - Founder &amp; Developer, based in Dallas, Texas. Johnny built HabitBuilder.pro from a simple idea: what if a habit tracker could actually coach you?</p>
    <h2>The Science Behind It</h2>
    <ul>
      <li>Behavioral Science: Every feature grounded in research from BJ Fogg's Tiny Habits, James Clear's Atomic Habits, and Charles Duhigg's habit loop framework.</li>
      <li>Personalized Coaching: AI interviews you, understands your goals, and builds a plan tailored to your life.</li>
      <li>Guided Sessions: Walk through each task with timers, coaching tips, and post-session summaries.</li>
    </ul>
    <p><a href="/">Home</a> | <a href="/templates">Templates</a> | <a href="/blog">Blog</a></p>
  </noscript>`;

  return { meta, schemas, noscript };
}

function getBlogListSeo(): { meta: string; schemas: string; noscript: string } {
  const articles = loadBlogArticles();

  const meta = `
    <title>Habit Building Blog - HabitBuilder.pro | Science-Backed Habit Tips</title>
    <meta name="description" content="Expert articles on habit formation, morning routines, habit stacking, and the science of behavior change. Practical, evidence-based strategies for building lasting habits." />
    <meta property="og:title" content="Habit Building Blog - HabitBuilder.pro" />
    <meta property="og:description" content="Expert articles on habit formation, morning routines, habit stacking, and behavior change science." />
    <meta property="og:url" content="${BASE_URL}/blog" />
    <link rel="canonical" href="${BASE_URL}/blog" />`;

  const schemas = jsonLdTag({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Habit Building Blog - HabitBuilder.pro",
    description: "Expert articles on habit formation, morning routines, habit stacking, and the science of behavior change.",
    url: `${BASE_URL}/blog`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/blog/${a.slug}`,
        name: a.title
      }))
    }
  });

  const articleLinks = articles.map(a =>
    `<li><a href="/blog/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a> - Published ${a.publishedDate} by ${escapeHtml(a.author)}</li>`
  ).join("\n      ");

  const noscript = `<noscript>
    ${NAV_LINKS}
    <h1>Habit Building Blog</h1>
    <p>Expert articles on habit formation, morning routines, habit stacking, and the science of behavior change.</p>
    <ul>
      ${articleLinks}
    </ul>
    <p><a href="/">Home</a> | <a href="/templates">Templates</a> | <a href="/about">About</a></p>
  </noscript>`;

  return { meta, schemas, noscript };
}

function getBlogArticleSeo(slug: string): { meta: string; schemas: string; noscript: string } | null {
  const articles = loadBlogArticles();
  const article = articles.find(a => a.slug === slug);
  if (!article) return null;

  const meta = `
    <title>${escapeHtml(article.title)} | HabitBuilder.pro Blog</title>
    <meta name="description" content="${escapeHtml(article.excerpt)}" />
    <meta name="keywords" content="${escapeHtml(article.keywords.join(", "))}" />
    <meta property="og:title" content="${escapeHtml(article.title)}" />
    <meta property="og:description" content="${escapeHtml(article.excerpt)}" />
    <meta property="og:url" content="${BASE_URL}/blog/${escapeHtml(article.slug)}" />
    <meta property="og:type" content="article" />
    <meta property="article:published_time" content="${article.publishedDate}" />
    <meta property="article:author" content="Johnny B Sharp" />
    <meta property="article:section" content="${escapeHtml(article.category)}" />
    <link rel="canonical" href="${BASE_URL}/blog/${escapeHtml(article.slug)}" />`;

  const schemaList = [
    jsonLdTag({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt,
      url: `${BASE_URL}/blog/${article.slug}`,
      datePublished: article.publishedDate,
      dateModified: article.publishedDate,
      image: `${BASE_URL}/icon-512.png`,
      articleSection: article.category,
      keywords: article.keywords.join(", "),
      author: [
        { "@type": "Organization", name: "HabitBuilder.pro", url: BASE_URL },
        { "@type": "Person", name: "Johnny B Sharp", url: `${BASE_URL}/about`, jobTitle: "Founder" }
      ],
      publisher: {
        "@type": "Organization",
        name: "HabitBuilder.pro",
        url: BASE_URL,
        logo: { "@type": "ImageObject", url: `${BASE_URL}/icon-192.png` }
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${article.slug}` }
    })
  ];

  if (article.faqs && article.faqs.length > 0) {
    schemaList.push(jsonLdTag({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: article.faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer }
      }))
    }));
  }

  const schemas = schemaList.join("\n");

  const sectionContent = article.sections.map(s =>
    `<h2>${escapeHtml(s.heading)}</h2>\n    <p>${escapeHtml(s.content.substring(0, 500))}...</p>`
  ).join("\n    ");

  const faqContent = article.faqs ? article.faqs.map(f =>
    `<h3>${escapeHtml(f.question)}</h3>\n    <p>${escapeHtml(f.answer)}</p>`
  ).join("\n    ") : "";

  const noscript = `<noscript>
    ${NAV_LINKS}
    <article>
      <h1>${escapeHtml(article.title)}</h1>
      <p>By ${escapeHtml(article.author)} | Published ${article.publishedDate} | ${escapeHtml(article.category)}</p>
      <p>${escapeHtml(article.excerpt)}</p>
      ${sectionContent}
      ${faqContent ? `<h2>Frequently Asked Questions</h2>\n    ${faqContent}` : ""}
    </article>
    <p>Written by the HabitBuilder.pro Team. Our content is grounded in behavioral science research from BJ Fogg, James Clear, and Charles Duhigg.</p>
    <p><a href="/blog">More Articles</a> | <a href="/templates">Browse Habit Templates</a> | <a href="/about">About Us</a></p>
  </noscript>`;

  return { meta, schemas, noscript };
}

function getTemplatesSeo(): { meta: string; schemas: string; noscript: string } {
  const meta = `
    <title>Habit Templates for Every Goal | HabitBuilder.pro Template Library</title>
    <meta name="description" content="Browse curated habit templates for wellness, fitness, learning, and more. Each template comes with AI-powered coaching that creates a personalized action plan just for you." />
    <meta property="og:title" content="Habit Templates - HabitBuilder.pro" />
    <meta property="og:description" content="Curated habit templates with AI coaching for wellness, fitness, learning and more." />
    <meta property="og:url" content="${BASE_URL}/templates" />
    <link rel="canonical" href="${BASE_URL}/templates" />`;

  const schemas = jsonLdTag({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Habit Templates - HabitBuilder.pro",
    description: "Curated habit templates for wellness, fitness, learning, and personal growth with AI-powered coaching.",
    url: `${BASE_URL}/templates`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Wellness & Mindfulness Templates", description: "Build habits for mental health, stress reduction, and mindfulness" },
        { "@type": "ListItem", position: 2, name: "Health & Fitness Templates", description: "Create sustainable routines for exercise, nutrition, and sleep" },
        { "@type": "ListItem", position: 3, name: "Learning & Growth Templates", description: "Develop habits for knowledge, skills, and personal development" }
      ]
    }
  });

  const noscript = `<noscript>
    ${NAV_LINKS}
    <h1>Habit Templates for Every Goal</h1>
    <p>Browse our curated collection of habit templates. Each comes with AI-powered coaching that creates a personalized action plan just for you.</p>
    <h2>Wellness &amp; Mindfulness</h2>
    <p>Build habits that nurture your mental health, reduce stress, and bring more peace into your daily life.</p>
    <h2>Health &amp; Fitness</h2>
    <p>Create sustainable routines for exercise, nutrition, and sleep that fit your lifestyle.</p>
    <h2>Learning &amp; Growth</h2>
    <p>Develop habits that expand your knowledge, skills, and personal development.</p>
    <p><a href="/">Home</a> | <a href="/blog">Blog</a> | <a href="/about">About</a> | <a href="/api/login">Get Started Free</a></p>
  </noscript>`;

  return { meta, schemas, noscript };
}

function getSeoForUrl(url: string): { meta: string; schemas: string; noscript: string } | null {
  const cleanUrl = url.split("?")[0].split("#")[0];

  if (cleanUrl === "/" || cleanUrl === "") {
    return getHomepageSeo();
  }
  if (cleanUrl === "/about") {
    return getAboutSeo();
  }
  if (cleanUrl === "/blog" || cleanUrl === "/blog/") {
    return getBlogListSeo();
  }
  if (cleanUrl === "/templates" || cleanUrl === "/templates/") {
    return getTemplatesSeo();
  }
  const blogMatch = cleanUrl.match(/^\/blog\/([a-z0-9-]+)$/);
  if (blogMatch) {
    return getBlogArticleSeo(blogMatch[1]);
  }
  return null;
}

export function injectSeo(html: string, url: string): string {
  const seo = getSeoForUrl(url);
  if (!seo) return html;

  let result = html;

  if (seo.meta) {
    const titleMatch = seo.meta.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      result = result.replace(/<title>[^<]*<\/title>/, `<title>${titleMatch[1]}</title>`);
      const metaWithoutTitle = seo.meta.replace(/<title>[^<]*<\/title>/, "");
      result = result.replace("</head>", `${metaWithoutTitle}\n  </head>`);
    } else {
      result = result.replace("</head>", `${seo.meta}\n  </head>`);
    }

    const canonicalMatch = seo.meta.match(/<link rel="canonical" href="([^"]+)"/);
    if (canonicalMatch) {
      result = result.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, "");
    }

    const descMatch = seo.meta.match(/<meta name="description" content="([^"]*)"/);
    if (descMatch) {
      result = result.replace(/<meta name="description" content="[^"]*"\s*\/?>/, "");
    }

    const ogUrlMatch = seo.meta.match(/<meta property="og:url" content="([^"]*)"/);
    if (ogUrlMatch) {
      result = result.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, "");
    }
    const ogTitleMatch = seo.meta.match(/<meta property="og:title" content="([^"]*)"/);
    if (ogTitleMatch) {
      result = result.replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, "");
    }
    const ogDescMatch = seo.meta.match(/<meta property="og:description" content="([^"]*)"/);
    if (ogDescMatch) {
      result = result.replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, "");
    }
  }

  if (seo.schemas) {
    result = result.replace("</head>", `${seo.schemas}\n  </head>`);
  }

  if (seo.noscript) {
    result = result.replace('<div id="root">', `<div id="root">${seo.noscript}`);
  }

  return result;
}
