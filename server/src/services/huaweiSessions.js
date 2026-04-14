import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pool } from "../db.js";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);
const SYSLOG_SOURCE = "huawei_syslog";
const SNAPSHOT_SOURCE = "huawei_snapshot";
let tableReadyPromise;

function formatMySqlDate(value) {
  const pad = (part) => String(part).padStart(2, "0");

  return [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate())
  ].join("-") + ` ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

function normalizeDateTime(value, { fallbackToNow = false } = {}) {
  if (!value && fallbackToNow) {
    return formatMySqlDate(new Date());
  }

  if (!value) {
    throw new Error("A datetime value is required.");
  }

  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return formatMySqlDate(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.valueOf())) {
      return formatMySqlDate(parsed);
    }
  }

  throw new Error(`Invalid datetime value: ${value}`);
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function normalizeByteCounter(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`Invalid byte counter value: ${value}`);
  }

  return Math.trunc(number);
}

function deriveSessionKey(session) {
  const explicitKey = normalizeNullableString(session.sessionKey);

  if (explicitKey) {
    return explicitKey;
  }

  const loginTime = session.loginTime ? normalizeDateTime(session.loginTime) : "";
  const primaryId =
    normalizeNullableString(session.sessionId) ||
    normalizeNullableString(session.cid) ||
    normalizeNullableString(session.username) ||
    "unknown";

  // Huawei can reuse CID/session IDs across different sessions, so loginTime
  // must be part of the persisted key to preserve historical rows.
  return [
    primaryId,
    normalizeNullableString(session.gatewayName) || "",
    normalizeNullableString(session.clientIp) || "",
    normalizeNullableString(session.assignedIp) || "",
    loginTime
  ].join("|");
}

function normalizeSessionPayload(payload) {
  const username = normalizeNullableString(payload.username);

  if (!username) {
    throw new Error("username is required.");
  }

  const loginTime = normalizeDateTime(payload.loginTime);

  return {
    source: normalizeNullableString(payload.source) || SYSLOG_SOURCE,
    // Persist a stable key so login and logout events can meet in the same row later.
    sessionKey: deriveSessionKey({ ...payload, username, loginTime }),
    sessionId: normalizeNullableString(payload.sessionId),
    cid: normalizeNullableString(payload.cid),
    username,
    loginTime,
    assignedIp: normalizeNullableString(payload.assignedIp),
    clientIp: normalizeNullableString(payload.clientIp || payload.accessIp),
    nasIp: normalizeNullableString(payload.nasIp),
    gatewayName: normalizeNullableString(payload.gatewayName),
    inputBytes: normalizeByteCounter(payload.inputBytes),
    outputBytes: normalizeByteCounter(payload.outputBytes),
    rawLoginLog: normalizeNullableString(payload.rawLoginLog),
    metadata: payload.metadata ? JSON.stringify(payload.metadata) : null
  };
}

function normalizeSnapshot(rawData) {
  const sessions = Array.isArray(rawData) ? rawData : rawData?.sessions;

  if (!Array.isArray(sessions)) {
    throw new Error("Huawei snapshot must be a JSON array or an object with a sessions array.");
  }

  return sessions.map((session, index) => {
    const username = normalizeNullableString(session.username);

    if (!username) {
      throw new Error(`Huawei session at index ${index} is missing username.`);
    }

    const loginTime = normalizeDateTime(session.loginTime);
    const gatewayName = normalizeNullableString(session.gatewayName || session.gateway);
    const clientIp = normalizeNullableString(session.clientIp || session.accessIp || session.accessIPAddress);
    const assignedIp = normalizeNullableString(session.assignedIp || session.allocatedIp);
    const nasIp = normalizeNullableString(session.nasIp || session.nasIPAddress);
    const sessionId = normalizeNullableString(session.sessionId || session.acctSessionId);
    const cid = normalizeNullableString(session.cid || session.connectId || session.huaweiConnectId);

    return {
      source: SNAPSHOT_SOURCE,
      sessionKey: deriveSessionKey({
        sessionKey: session.sessionKey,
        sessionId,
        cid,
        username,
        gatewayName,
        clientIp,
        assignedIp,
        loginTime
      }),
      sessionId,
      cid,
      username,
      loginTime,
      assignedIp,
      clientIp,
      nasIp,
      gatewayName,
      rawPayload: JSON.stringify(session)
    };
  });
}

function isHuaweiSessionsMode() {
  return config.sessions.source === "huawei";
}

function isSnapshotSyncEnabled() {
  return isHuaweiSessionsMode() && config.sessions.huawei.snapshotMode !== "disabled";
}

async function loadSnapshotFromCommand(command) {
  if (!command) {
    throw new Error("HUAWEI_SESSION_COMMAND is empty.");
  }

  const { stdout } = await execFileAsync("bash", ["-lc", command], {
    timeout: config.sessions.huawei.commandTimeoutMs,
    maxBuffer: 1024 * 1024
  });

  return stdout;
}

async function loadSnapshotText() {
  const { snapshotMode, snapshotCommand, snapshotFile } = config.sessions.huawei;

  if (snapshotMode === "file") {
    if (!snapshotFile) {
      throw new Error("HUAWEI_SESSION_FILE is empty.");
    }

    return fs.readFile(snapshotFile, "utf8");
  }

  return loadSnapshotFromCommand(snapshotCommand);
}

async function runTableMigration() {
  // The app is able to bootstrap vpn_sessions on its own during deployment.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vpn_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      source VARCHAR(32) NOT NULL,
      session_key VARCHAR(255) NOT NULL,
      session_id VARCHAR(128) NULL,
      cid VARCHAR(128) NULL,
      username VARCHAR(255) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      login_time DATETIME NOT NULL,
      logout_time DATETIME NULL,
      session_duration INT UNSIGNED NULL,
      assigned_ip VARCHAR(64) NULL,
      client_ip VARCHAR(64) NULL,
      nas_ip VARCHAR(64) NULL,
      gateway_name VARCHAR(255) NULL,
      input_bytes BIGINT UNSIGNED NULL,
      output_bytes BIGINT UNSIGNED NULL,
      raw_login_log LONGTEXT NULL,
      raw_logout_log LONGTEXT NULL,
      raw_payload JSON NULL,
      metadata JSON NULL,
      last_seen_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_vpn_session_source_key (source, session_key),
      KEY idx_vpn_sessions_status (status),
      KEY idx_vpn_sessions_login_time (login_time),
      KEY idx_vpn_sessions_logout_time (logout_time),
      KEY idx_vpn_sessions_username (username),
      KEY idx_vpn_sessions_session_id (session_id),
      KEY idx_vpn_sessions_cid (cid)
    )
  `);

  const alterStatements = [
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS session_id VARCHAR(128) NULL AFTER session_key",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS cid VARCHAR(128) NULL AFTER session_id",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active' AFTER username",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64) NULL AFTER assigned_ip",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS input_bytes BIGINT UNSIGNED NULL AFTER gateway_name",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS output_bytes BIGINT UNSIGNED NULL AFTER input_bytes",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS raw_login_log LONGTEXT NULL AFTER output_bytes",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS raw_logout_log LONGTEXT NULL AFTER raw_login_log",
    "ALTER TABLE vpn_sessions ADD COLUMN IF NOT EXISTS metadata JSON NULL AFTER raw_payload",
    "ALTER TABLE vpn_sessions ADD INDEX IF NOT EXISTS idx_vpn_sessions_status (status)",
    "ALTER TABLE vpn_sessions ADD INDEX IF NOT EXISTS idx_vpn_sessions_session_id (session_id)",
    "ALTER TABLE vpn_sessions ADD INDEX IF NOT EXISTS idx_vpn_sessions_cid (cid)"
  ];

  for (const statement of alterStatements) {
    await pool.query(statement);
  }
}

export async function ensureHuaweiSessionsTable() {
  if (!tableReadyPromise) {
    // Reuse a single migration promise so concurrent requests do not race.
    tableReadyPromise = runTableMigration();
  }

  await tableReadyPromise;
}

export async function loadHuaweiSnapshot() {
  const snapshotText = await loadSnapshotText();

  let parsed;
  try {
    parsed = JSON.parse(snapshotText);
  } catch (error) {
    throw new Error(`Failed to parse Huawei session snapshot JSON: ${error.message}`);
  }

  return normalizeSnapshot(parsed);
}

export async function recordHuaweiSessionLogin(payload) {
  await ensureHuaweiSessionsTable();

  const session = normalizeSessionPayload(payload);

  // Duplicate login packets should refresh the same row instead of creating noise.
  await pool.query(
    `
      INSERT INTO vpn_sessions (
        source,
        session_key,
        session_id,
        cid,
        username,
        status,
        login_time,
        logout_time,
        session_duration,
        assigned_ip,
        client_ip,
        nas_ip,
        gateway_name,
        input_bytes,
        output_bytes,
        raw_login_log,
        raw_logout_log,
        metadata,
        last_seen_at
      )
      VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW())
      ON DUPLICATE KEY UPDATE
        session_id = VALUES(session_id),
        cid = VALUES(cid),
        username = VALUES(username),
        status = 'active',
        login_time = VALUES(login_time),
        logout_time = NULL,
        session_duration = NULL,
        assigned_ip = VALUES(assigned_ip),
        client_ip = VALUES(client_ip),
        nas_ip = VALUES(nas_ip),
        gateway_name = VALUES(gateway_name),
        input_bytes = VALUES(input_bytes),
        output_bytes = VALUES(output_bytes),
        raw_login_log = VALUES(raw_login_log),
        metadata = VALUES(metadata),
        last_seen_at = NOW()
    `,
    [
      session.source,
      session.sessionKey,
      session.sessionId,
      session.cid,
      session.username,
      session.loginTime,
      session.assignedIp,
      session.clientIp,
      session.nasIp,
      session.gatewayName,
      session.inputBytes,
      session.outputBytes,
      session.rawLoginLog,
      session.metadata
    ]
  );

  return session;
}

function buildLookupFromLogout(payload) {
  const source = normalizeNullableString(payload.source) || SYSLOG_SOURCE;
  const sessionKey = normalizeNullableString(payload.sessionKey);
  const sessionId = normalizeNullableString(payload.sessionId);
  const cid = normalizeNullableString(payload.cid);
  const username = normalizeNullableString(payload.username);

  const candidates = [
    // Try the most specific identifiers first and fall back gradually.
    sessionKey ? { sql: "source = ? AND session_key = ? AND logout_time IS NULL", params: [source, sessionKey] } : null,
    sessionId && username ? { sql: "source = ? AND session_id = ? AND username = ? AND logout_time IS NULL", params: [source, sessionId, username] } : null,
    cid && username ? { sql: "source = ? AND cid = ? AND username = ? AND logout_time IS NULL", params: [source, cid, username] } : null,
    sessionId ? { sql: "source = ? AND session_id = ? AND logout_time IS NULL", params: [source, sessionId] } : null,
    cid ? { sql: "source = ? AND cid = ? AND logout_time IS NULL", params: [source, cid] } : null,
    username ? { sql: "source = ? AND username = ? AND logout_time IS NULL", params: [source, username] } : null
  ].filter(Boolean);

  if (candidates.length === 0) {
    throw new Error("Logout event must include sessionKey, sessionId, cid, or username.");
  }

  return candidates;
}

export async function recordHuaweiSessionLogout(payload) {
  await ensureHuaweiSessionsTable();

  const logoutTime = normalizeDateTime(payload.logoutTime, { fallbackToNow: true });
  const inputBytes = normalizeByteCounter(payload.inputBytes ?? payload.obverseBytes);
  const outputBytes = normalizeByteCounter(payload.outputBytes ?? payload.reverseBytes);
  const rawLogoutLog = normalizeNullableString(payload.rawLogoutLog);
  const metadata = payload.metadata ? JSON.stringify(payload.metadata) : null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let sessionRow = null;

    for (const candidate of buildLookupFromLogout(payload)) {
      const [rows] = await connection.query(
        `
          SELECT id, login_time
          FROM vpn_sessions
          WHERE ${candidate.sql}
          ORDER BY login_time DESC
          LIMIT 1
          FOR UPDATE
        `,
        candidate.params
      );

      if (rows.length > 0) {
        sessionRow = rows[0];
        break;
      }
    }

    if (!sessionRow) {
      await connection.rollback();
      return null;
    }

    await connection.query(
      `
        UPDATE vpn_sessions
        SET
          status = 'closed',
          logout_time = ?,
          session_duration = GREATEST(TIMESTAMPDIFF(SECOND, login_time, ?), 0),
          input_bytes = COALESCE(?, input_bytes),
          output_bytes = COALESCE(?, output_bytes),
          raw_logout_log = COALESCE(?, raw_logout_log),
          metadata = COALESCE(?, metadata),
          last_seen_at = NOW()
        WHERE id = ?
      `,
      [logoutTime, logoutTime, inputBytes, outputBytes, rawLogoutLog, metadata, sessionRow.id]
    );

    const [[updatedRow]] = await connection.query(
      `
        SELECT
          id,
          source,
          session_key AS sessionKey,
          session_id AS sessionId,
          cid,
          username,
          status,
          login_time AS loginTime,
          logout_time AS logoutTime,
          session_duration AS sessionDuration,
          assigned_ip AS assignedIp,
          client_ip AS clientIp,
          nas_ip AS nasIp,
          gateway_name AS gatewayName,
          input_bytes AS inputBytes,
          output_bytes AS outputBytes
        FROM vpn_sessions
        WHERE id = ?
      `,
      [sessionRow.id]
    );

    await connection.commit();
    return updatedRow;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncHuaweiSessions() {
  if (!isSnapshotSyncEnabled()) {
    return 0;
  }

  await ensureHuaweiSessionsTable();

  // Snapshot mode periodically reconciles the DB against an external "currently connected" list.
  const snapshot = await loadHuaweiSnapshot();
  const connection = await pool.getConnection();
  const now = formatMySqlDate(new Date());

  try {
    await connection.beginTransaction();

    for (const session of snapshot) {
      await connection.query(
        `
          INSERT INTO vpn_sessions (
            source,
            session_key,
            session_id,
            cid,
            username,
            status,
            login_time,
            logout_time,
            session_duration,
            assigned_ip,
            client_ip,
            nas_ip,
            gateway_name,
            raw_payload,
            last_seen_at
          )
          VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, NULL, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            session_id = VALUES(session_id),
            cid = VALUES(cid),
            username = VALUES(username),
            status = 'active',
            assigned_ip = VALUES(assigned_ip),
            client_ip = VALUES(client_ip),
            nas_ip = VALUES(nas_ip),
            gateway_name = VALUES(gateway_name),
            raw_payload = VALUES(raw_payload),
            logout_time = NULL,
            session_duration = NULL,
            last_seen_at = VALUES(last_seen_at)
        `,
        [
          session.source,
          session.sessionKey,
          session.sessionId,
          session.cid,
          session.username,
          session.loginTime,
          session.assignedIp,
          session.clientIp,
          session.nasIp,
          session.gatewayName,
          session.rawPayload,
          now
        ]
      );
    }

    if (snapshot.length === 0) {
      // No sessions in the snapshot means every previous snapshot row is now closed.
      await connection.query(
        `
          UPDATE vpn_sessions
          SET
            status = 'closed',
            logout_time = ?,
            session_duration = GREATEST(TIMESTAMPDIFF(SECOND, login_time, ?), 0)
          WHERE source = ?
            AND logout_time IS NULL
        `,
        [now, now, SNAPSHOT_SOURCE]
      );
    } else {
      // Close any snapshot-origin rows that are missing from the latest export.
      await connection.query(
        `
          UPDATE vpn_sessions
          SET
            status = 'closed',
            logout_time = ?,
            session_duration = GREATEST(TIMESTAMPDIFF(SECOND, login_time, ?), 0)
          WHERE source = ?
            AND logout_time IS NULL
            AND session_key NOT IN (?)
        `,
        [now, now, SNAPSHOT_SOURCE, snapshot.map((session) => session.sessionKey)]
      );
    }

    await connection.commit();
    return snapshot.length;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function startHuaweiSessionSyncLoop() {
  if (!isSnapshotSyncEnabled()) {
    return;
  }

  const runSync = async () => {
    try {
      await syncHuaweiSessions();
    } catch (error) {
      console.warn(`[sessions] Huawei sync failed: ${error.message}`);
    }
  };

  // Run once on boot, then keep reconciling in the background.
  runSync();

  const interval = setInterval(runSync, config.sessions.huawei.syncIntervalMs);
  interval.unref();
}
