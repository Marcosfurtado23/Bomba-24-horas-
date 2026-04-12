import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  let vite: any;
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
  }

  // Intercept requests to inject meta tags
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      let template = "";
      if (process.env.NODE_ENV !== "production") {
        template = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
      } else {
        template = fs.readFileSync(path.resolve(__dirname, "dist/index.html"), "utf-8");
      }

      let metaTags = "";

      // Check if it's an article page
      const articleMatch = url.match(/^\/article\/([a-zA-Z0-9_-]+)$/);
      if (articleMatch) {
        const articleId = articleMatch[1];
        console.log(`Intercepted article request for ID: ${articleId}`);
        try {
          // Fetch article from Firestore REST API
          const projectId = "project-a743ebf2-7fcf-4efd-89f";
          const databaseId = "ai-studio-a301a323-88f4-4fb9-8efa-2c99cff7771a";
          const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}`;
          
          console.log(`Fetching from: ${firestoreUrl}`);
          const response = await fetch(firestoreUrl);
          if (response.ok) {
            const data = await response.json();
            console.log(`Successfully fetched article data`);
            if (data.fields) {
              const title = data.fields.title?.stringValue || "Notícia";
              const summary = data.fields.summary?.stringValue || "";
              const imageUrl = data.fields.imageUrl?.stringValue || "";

              metaTags = `
                <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
                <meta property="og:description" content="${summary.replace(/"/g, '&quot;')}" />
                <meta property="og:image" content="${imageUrl}" />
                <meta property="og:type" content="article" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
                <meta name="twitter:description" content="${summary.replace(/"/g, '&quot;')}" />
                <meta name="twitter:image" content="${imageUrl}" />
              `;
            }
          }
        } catch (error) {
          console.error("Error fetching article for meta tags:", error);
        }
      }

      // Inject meta tags into the head
      if (metaTags) {
        template = template.replace("</head>", `${metaTags}</head>`);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e: any) {
      if (vite) {
        vite.ssrFixStacktrace(e);
      }
      console.error(e.stack);
      res.status(500).end(e.stack);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
