import { pool } from "../db.js";
import { config } from "../config.js";
import { ensureHuaweiSessionsTable, syncHuaweiSessions } from "./huaweiSessions.js";

function buildWhereClause(filters, fields) {
  const conditions = [];
  const params = [];
  // Filtering is always based on login date because that is what the UI exposes today.
  const localDateExpression = `DATE(${fields.loginTime})`;

  if (filters.username) {
    conditions.push(`${fields.username} LIKE ?`);
    params.push(`%${filters.username}%`);
  }

  if (filters.dateFrom) {
    conditions.push(`${localDateExpression} >= ?`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`${localDateExpression} <= ?`);
    params.push(filters.dateTo);
  }

  if (filters.activeOnly) {
    conditions.push(`${fields.logoutTime} IS NULL`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params
  };
}

async function syncHuaweiSessionsSafely() {
  await ensureHuaweiSessionsTable();

  try {
    // Snapshot sync is optional; when it fails we still serve cached rows from the DB.
    await syncHuaweiSessions();
  } catch (error) {
    console.warn(`[sessions] Serving cached Huawei sessions: ${error.message}`);
  }
}

async function getRadiusSessions(filters) {
  const { whereClause, params } = buildWhereClause(filters, {
    username: "username",
    loginTime: "acctstarttime",
    logoutTime: "acctstoptime"
  });

  const [rows] = await pool.query(
    `
      SELECT
        radacctid AS id,
        username,
        acctstarttime AS loginTime,
        acctstoptime AS logoutTime,
        acctsessiontime AS sessionDuration,
        framedipaddress AS assignedIp,
        nasipaddress AS nasIp,
        NULL AS gatewayName,
        NULL AS accessIp,
        CASE
          WHEN acctstoptime IS NULL THEN 'Active'
          ELSE 'Closed'
        END AS sessionStatus
      FROM radacct
      ${whereClause}
      ORDER BY acctstarttime DESC
      LIMIT 200
    `,
    params
  );

  return rows;
}

async function getHuaweiSessions(filters) {
  // In Huawei mode the local table is the source of truth for both history and active sessions.
  await syncHuaweiSessionsSafely();

  const { whereClause, params } = buildWhereClause(filters, {
    username: "username",
    loginTime: "login_time",
    logoutTime: "logout_time"
  });

  const [rows] = await pool.query(
    `
      SELECT
        id,
        username,
        login_time AS loginTime,
        logout_time AS logoutTime,
        CASE
          WHEN logout_time IS NULL THEN GREATEST(TIMESTAMPDIFF(SECOND, login_time, NOW()), 0)
          ELSE session_duration
        END AS sessionDuration,
        assigned_ip AS assignedIp,
        nas_ip AS nasIp,
        gateway_name AS gatewayName,
        client_ip AS accessIp,
        CASE
          WHEN logout_time IS NULL THEN 'Active'
          ELSE 'Closed'
        END AS sessionStatus
      FROM vpn_sessions
      ${whereClause}
      ORDER BY login_time DESC
      LIMIT 200
    `,
    params
  );

  return rows;
}

export async function listSessions(filters) {
  if (config.sessions.source === "huawei") {
    return getHuaweiSessions(filters);
  }

  return getRadiusSessions(filters);
}

export async function countActiveSessions() {
  if (config.sessions.source === "huawei") {
    await syncHuaweiSessionsSafely();

    const [[{ activeSessions }]] = await pool.query(
      `
        SELECT COUNT(*) AS activeSessions
        FROM vpn_sessions
        WHERE logout_time IS NULL
      `
    );

    return activeSessions;
  }

  const [[{ activeSessions }]] = await pool.query(
    `
      SELECT COUNT(*) AS activeSessions
      FROM radacct
      WHERE acctstoptime IS NULL
    `
  );

  return activeSessions;
}

export async function listActiveSessions(limit = 10) {
  if (config.sessions.source === "huawei") {
    await syncHuaweiSessionsSafely();

    const [rows] = await pool.query(
      `
        SELECT
          id,
          username,
          login_time AS loginTime,
          assigned_ip AS assignedIp,
          COALESCE(gateway_name, nas_ip) AS nasIp,
          client_ip AS accessIp,
          gateway_name AS gatewayName
        FROM vpn_sessions
        WHERE logout_time IS NULL
        ORDER BY login_time DESC
        LIMIT ?
      `,
      [limit]
    );

    return rows;
  }

  const [rows] = await pool.query(
    `
      SELECT
        radacctid AS id,
        username,
        acctstarttime AS loginTime,
        framedipaddress AS assignedIp,
        nasipaddress AS nasIp,
        NULL AS accessIp,
        NULL AS gatewayName
      FROM radacct
      WHERE acctstoptime IS NULL
      ORDER BY acctstarttime DESC
      LIMIT ?
    `,
    [limit]
  );

  return rows;
}
