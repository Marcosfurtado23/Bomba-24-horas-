import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import webpush from "web-push";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure web-push with VAPID keys
const publicVapidKey = "BHcD_uds4CvnJekR3_QxpwL-ieiZgshI5_RcDqz7zyu7DUhbVoU67F02rQAtcut8hpvMf_E7HxDgOX0lJq1nXus";
const privateVapidKey = "fHavzLu8uzw_ENprqRV3LsoDa32TlmlZ1XTYg4C6uWc";
webpush.setVapidDetails(
  "mailto:contato@bomba24horas.com.br",
  publicVapidKey,
  privateVapidKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

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

  // API route for sending push notifications
  app.post("/api/notify", async (req, res) => {
    const { subscriptions, payload } = req.body;
    
    if (!subscriptions || !Array.isArray(subscriptions)) {
      return res.status(400).json({ error: "Invalid subscriptions array" });
    }

    const notificationPayload = JSON.stringify({
      title: `Bomba 24 horas: ${payload.title}`,
      body: "Leia agora!",
      url: payload.url || "/",
    });

    const sendPromises = subscriptions.map((sub) =>
      webpush.sendNotification(sub, notificationPayload).catch((error) => {
        console.error("Error sending notification, reason: ", error);
        // We could return the failed subscription to delete it from Firestore later
        return { error, endpoint: sub.endpoint };
      })
    );

    await Promise.all(sendPromises);
    res.status(200).json({ message: "Notifications sent successfully." });
  });

  // API route for serving images
  app.get("/api/image/:articleId", async (req, res) => {
    const articleId = req.params.articleId;
    try {
      const projectId = "project-a743ebf2-7fcf-4efd-89f";
      const databaseId = "ai-studio-a301a323-88f4-4fb9-8efa-2c99cff7771a";
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/articles/${articleId}`;
      
      const response = await fetch(firestoreUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.fields && data.fields.imageUrl && data.fields.imageUrl.stringValue) {
          const imageUrl = data.fields.imageUrl.stringValue;
          
          // Check if it's a base64 image
          const matches = imageUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          
          if (matches && matches.length === 3) {
            const type = matches[1];
            const buffer = Buffer.from(matches[2], 'base64');
            
            res.set('Content-Type', type);
            res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            return res.send(buffer);
          } else if (imageUrl.startsWith('http')) {
            // If it's already a URL, redirect to it
            return res.redirect(imageUrl);
          }
        }
      }
      
      // Fallback image or 404
      res.status(404).send('Image not found');
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).send('Internal Server Error');
    }
  });

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
              
              const protocol = req.headers['x-forwarded-proto'] || req.protocol;
              const host = req.headers['x-forwarded-host'] || req.get('host');
              const fullImageUrl = `${protocol}://${host}/api/image/${articleId}`;

              metaTags = `
                <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
                <meta property="og:description" content="${summary.replace(/"/g, '&quot;')}" />
                <meta property="og:image" content="${fullImageUrl}" />
                <meta property="og:type" content="article" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:title" content="${title.replace(/"/g, '&quot;')}" />
                <meta name="twitter:description" content="${summary.replace(/"/g, '&quot;')}" />
                <meta name="twitter:image" content="${fullImageUrl}" />
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
