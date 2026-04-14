import { config } from "../config.js";

export function requireIngestToken(req, res, next) {
  // Internal callers may use either a dedicated header or a Bearer token.
  const headerToken = req.headers["x-ingest-token"];
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const token = String(headerToken || bearerToken || "").trim();

  if (!config.sessions.ingestToken) {
    return res.status(503).json({ message: "Session ingest token is not configured." });
  }

  if (!token || token !== config.sessions.ingestToken) {
    return res.status(401).json({ message: "Invalid ingest token." });
  }

  return next();
}
