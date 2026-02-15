import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { injectSeo } from "./seoInjector";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexPath = path.resolve(distPath, "index.html");
  let indexHtml = "";
  try {
    indexHtml = fs.readFileSync(indexPath, "utf-8");
  } catch (e) {
    console.error("Failed to read index.html for SEO injection:", e);
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    const url = req.originalUrl.split("?")[0].split("#")[0];

    if (url.startsWith("/api") || url.startsWith("/vite-hmr")) {
      return next();
    }

    const hasExtension = path.extname(url) !== "";
    if (hasExtension) {
      return next();
    }

    if (!indexHtml) {
      return res.sendFile(indexPath);
    }

    try {
      const injected = injectSeo(indexHtml, url);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(injected);
    } catch (e) {
      console.error("SEO injection error in production for URL:", url, e);
      res.sendFile(indexPath);
    }
  });

  app.use(express.static(distPath));
}
