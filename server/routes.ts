import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import sheetsRouter from "./routes/sheets";
import timelineRouter from "./routes/timeline";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Google Sheets API proxy routes
  app.use("/api/sheets", sheetsRouter);

  // Timeline routes (local database storage)
  app.use("/api/timeline", timelineRouter);

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      sheetsConfigured: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_API_KEY)
    });
  });

  app.get(api.messages.list.path, async (req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  return httpServer;
}
