import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sftpMonitor } from "./sftp-monitor";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Redis client configuration for sessions (only in production)
let redisClient: any = null;

if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL
  });

  redisClient.on('error', (err: Error) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis connected for session storage');
  });

  // Connect to Redis only in production
  redisClient.connect().catch(console.error);
}

// Session configuration with Redis store for production
const sessionConfig: any = {
  secret: process.env.SESSION_SECRET || 'pii-detector-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
};

// Use Redis store in production, memory store in development
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL && redisClient) {
  try {
    sessionConfig.store = new RedisStore({
      client: redisClient,
      prefix: 'pii-detector:sess:',
      ttl: 24 * 60 * 60 // 24 hours in seconds
    });
    console.log('Using Redis session store for production');
  } catch (error) {
    console.log('Redis not available, falling back to memory store');
  }
} else {
  console.log('Using memory session store for development');
}

app.use(session(sessionConfig));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Start SFTP monitoring
  try {
    await sftpMonitor.start();
  } catch (error) {
    console.warn("SFTP monitor não iniciado:", error);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the configured port
  // Defaults to 5000 if PORT is not specified
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
