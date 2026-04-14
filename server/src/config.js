import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env");

// Always load environment variables from the project root.
dotenv.config({ path: envPath });

const required = ["JWT_SECRET", "ADMIN_USERNAME", "DB_HOST", "DB_USER", "DB_NAME"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

// Centralized runtime config keeps the rest of the app free from direct
// process.env access and makes feature flags easier to discover.
export const config = {
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT || 3000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD || "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || "",
  adminEmail: process.env.ADMIN_EMAIL || "",
  appTimezoneOffsetMinutes: Number(process.env.APP_TIMEZONE_OFFSET_MINUTES || -480),
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME
  },
  radius: {
    nasIp: process.env.RADIUS_NAS_IP || "",
    coaSecret: process.env.RADIUS_COA_SECRET || "",
    coaPort: Number(process.env.RADIUS_COA_PORT || 3799)
  },
  sessions: {
    source: process.env.SESSION_SOURCE || "radius",
    ingestToken: process.env.SESSION_INGEST_TOKEN || "",
    huawei: {
      snapshotMode: process.env.HUAWEI_SESSION_SNAPSHOT_MODE || "disabled",
      snapshotCommand: process.env.HUAWEI_SESSION_COMMAND || "",
      snapshotFile: process.env.HUAWEI_SESSION_FILE || "",
      syncIntervalMs: Number(process.env.HUAWEI_SESSION_SYNC_INTERVAL_SECONDS || 60) * 1000,
      commandTimeoutMs: Number(process.env.HUAWEI_SESSION_COMMAND_TIMEOUT_MS || 15000),
      syslog: {
        enabled: process.env.HUAWEI_SYSLOG_LISTENER_ENABLED === "true",
        host: process.env.HUAWEI_SYSLOG_HOST || "0.0.0.0",
        port: Number(process.env.HUAWEI_SYSLOG_PORT || 514),
        timezoneOffset: process.env.HUAWEI_SYSLOG_TIMEZONE || "+08:00",
        dedupWindowMs: Number(process.env.HUAWEI_SYSLOG_DEDUP_WINDOW_SECONDS || 10) * 1000,
        logIgnoredMessages: process.env.HUAWEI_SYSLOG_LOG_IGNORED === "true"
      }
    }
  }
};
