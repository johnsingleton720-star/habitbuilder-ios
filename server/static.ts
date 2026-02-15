import express, { type Express } from "express";
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

  app.use(express.static(distPath));

  const indexPath = path.resolve(distPath, "index.html");
  let indexHtml = "";
  try {
    indexHtml = fs.readFileSync(indexPath, "utf-8");
  } catch (e) {
    console.error("Failed to read index.html for SEO injection:", e);
  }

  app.use("/{*path}", (req, res) => {
    if (!indexHtml) {
      return res.sendFile(indexPath);
    }
    try {
      const injected = injectSeo(indexHtml, req.path);
      res.setHeader("Content-Type", "text/html");
      res.send(injected);
    } catch (e) {
      console.error("SEO injection error in production:", e);
      res.sendFile(indexPath);
    }
  });
}
