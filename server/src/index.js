import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import internalSessionsRoutes from "./routes/internalSessions.js";
import usersRoutes from "./routes/users.js";
import sessionsRoutes from "./routes/sessions.js";
import { startHuaweiSessionSyncLoop } from "./services/huaweiSessions.js";
import { startHuaweiSyslogListener } from "./services/huaweiSyslogListener.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../../client/dist");

// Allow the browser app to send credentialed requests to the API.
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

// Lightweight endpoint for service checks and reverse-proxy monitoring.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// API modules are kept separate by domain to keep the entry file small.
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/internal/sessions", internalSessionsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/sessions", sessionsRoutes);

if (fs.existsSync(distPath)) {
  // In production the built Vue app is served by the same Express process.
  app.use(express.static(distPath));

  // Any non-API route should load the SPA entry so Vue Router can take over.
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Keep API errors consistent for the frontend.
app.use((error, _req, res, _next) => {
  const status = error.message === "Username already exists." ? 409 : 500;
  res.status(status).json({
    message: error.message || "Internal server error"
  });
});

app.listen(config.port, config.host, () => {
  console.log(`VPN admin server listening on http://${config.host}:${config.port}`);
});

// Background Huawei jobs live in the same Node process as the API server.
startHuaweiSessionSyncLoop();
startHuaweiSyslogListener();
