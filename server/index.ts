import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { pool } from "./db";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
    role: "management" | "default";
    dealsAuthenticated: boolean;
    constructionAuthenticated: boolean;
    managementAuthenticated: boolean;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Session middleware for password gate — persisted in PostgreSQL so sessions
// survive server restarts.  Cookie (and DB row) lives for 24 hours.
const PgStore = connectPgSimple(session);
app.use(
  session({
    store: new PgStore({
      pool: pool as any,          // reuse the existing pg pool
      createTableIfMissing: true, // auto-create "session" table on first run
    }),
    secret: process.env.SESSION_SECRET || "aya-dashboard-secret-key-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  }),
);

// Auth endpoints
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { password, requestedRole } = req.body;
  const gatePassword = process.env.PASSWORD_GATE;
  const managementPassword = process.env.MANAGEMENT_PASSWORD_GATE;

  if (!gatePassword && !managementPassword) {
    // No passwords configured — allow full access
    req.session.authenticated = true;
    req.session.role = "management";
    return res.json({ success: true, role: "management" });
  }

  // Management login requested (from /management route)
  if (requestedRole === "management") {
    if (managementPassword && password === managementPassword) {
      req.session.authenticated = true;
      req.session.role = "management";
      return res.json({ success: true, role: "management" });
    }
    return res.status(401).json({ message: "Incorrect password" });
  }

  // Default login — accept either password
  if (managementPassword && password === managementPassword) {
    req.session.authenticated = true;
    req.session.role = "management";
    return res.json({ success: true, role: "management" });
  }

  if (gatePassword && password === gatePassword) {
    req.session.authenticated = true;
    req.session.role = "default";
    return res.json({ success: true, role: "default" });
  }

  return res.status(401).json({ message: "Incorrect password" });
});

app.get("/api/auth/check", (req: Request, res: Response) => {
  const gatePassword = process.env.PASSWORD_GATE;
  const managementPassword = process.env.MANAGEMENT_PASSWORD_GATE;
  if (!gatePassword && !managementPassword) {
    return res.json({ authenticated: true, role: "management" });
  }
  return res.json({
    authenticated: !!req.session.authenticated,
    role: req.session.role || null,
  });
});

// Per-tab auth endpoints
app.post("/api/auth/tab-login", (req: Request, res: Response) => {
  const { password, tab } = req.body;
  const gatePassword = process.env.PASSWORD_GATE;
  const managementPassword = process.env.MANAGEMENT_PASSWORD_GATE;
  const dealsPassword = process.env.DEALS_PASSWORD;

  if (tab === "construction") {
    if (!gatePassword || password === gatePassword) {
      req.session.constructionAuthenticated = true;
      req.session.authenticated = true;
      req.session.role = req.session.role || "default";
      return res.json({ success: true, tab: "construction" });
    }
    return res.status(401).json({ message: "Incorrect password" });
  }

  if (tab === "budget" || tab === "timeline") {
    if (!managementPassword || password === managementPassword) {
      req.session.managementAuthenticated = true;
      req.session.constructionAuthenticated = true; // management can also see construction
      req.session.authenticated = true;
      req.session.role = "management";
      return res.json({ success: true, tab });
    }
    return res.status(401).json({ message: "Incorrect password" });
  }

  if (tab === "deals") {
    if (!dealsPassword || password === dealsPassword) {
      req.session.dealsAuthenticated = true;
      req.session.authenticated = true;
      req.session.role = "management";
      return res.json({ success: true, tab: "deals" });
    }
    return res.status(401).json({ message: "Incorrect password" });
  }

  return res.status(400).json({ message: "Invalid tab" });
});

app.get("/api/auth/tab-check", (req: Request, res: Response) => {
  const gatePassword = process.env.PASSWORD_GATE;
  const managementPassword = process.env.MANAGEMENT_PASSWORD_GATE;
  const dealsPassword = process.env.DEALS_PASSWORD;

  const management = !managementPassword || !!req.session.managementAuthenticated;
  const construction = !gatePassword || !!req.session.constructionAuthenticated || management;
  const deals = !dealsPassword || !!req.session.dealsAuthenticated;
  const anyAuthenticated = construction || management || deals;

  return res.json({
    construction,
    management,
    deals,
    anyAuthenticated,
  });
});

// Deals-specific auth endpoints
app.post("/api/auth/deals-login", (req: Request, res: Response) => {
  const { password } = req.body;
  const dealsPassword = process.env.DEALS_PASSWORD;

  if (!dealsPassword) {
    // No password configured — allow access
    req.session.dealsAuthenticated = true;
    return res.json({ success: true });
  }

  if (password === dealsPassword) {
    req.session.dealsAuthenticated = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ message: "Incorrect password" });
});

app.get("/api/auth/deals-check", (req: Request, res: Response) => {
  const dealsPassword = process.env.DEALS_PASSWORD;
  if (!dealsPassword) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: !!req.session.dealsAuthenticated });
});

app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.json({ success: true });
  });
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
