import crypto from "node:crypto";
import dgram from "node:dgram";
import { config } from "../config.js";
import { recordHuaweiSessionLogin, recordHuaweiSessionLogout } from "./huaweiSessions.js";

const MONTHS = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12"
};

const recentEventCache = new Map();

function cleanupRecentEvents(now) {
  for (const [hash, expiresAt] of recentEventCache.entries()) {
    if (expiresAt <= now) {
      recentEventCache.delete(hash);
    }
  }
}

function rememberEvent(rawMessage) {
  const now = Date.now();
  cleanupRecentEvents(now);

  // Huawei devices sometimes resend the same line; a short dedup window keeps the table clean.
  const hash = crypto.createHash("sha256").update(rawMessage).digest("hex");
  const expiresAt = recentEventCache.get(hash);

  if (expiresAt && expiresAt > now) {
    return false;
  }

  recentEventCache.set(hash, now + config.sessions.huawei.syslog.dedupWindowMs);
  return true;
}

function parseSyslogTimestamp(value) {
  const match = value.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})$/);

  if (!match) {
    throw new Error(`Unsupported syslog timestamp: ${value}`);
  }

  const [, monthName, day, year, time] = match;
  const month = MONTHS[monthName];

  if (!month) {
    throw new Error(`Unsupported syslog month: ${monthName}`);
  }

  // Huawei SSL VPN syslog headers are emitted in UTC on this deployment, so
  // we treat the header timestamp as-is and keep the offset configurable only
  // for environments that prove otherwise.
  const dateText = `${year}-${month}-${String(day).padStart(2, "0")}T${time}${config.sessions.huawei.syslog.timezoneOffset}`;
  const parsed = new Date(dateText);

  if (Number.isNaN(parsed.valueOf())) {
    throw new Error(`Failed to parse syslog date: ${dateText}`);
  }

  return parsed.toISOString();
}

function extractField(rawMessage, pattern) {
  const match = rawMessage.match(pattern);
  return match?.[1]?.trim() || null;
}

function parseEnvelope(rawMessage) {
  const cleaned = rawMessage.replace(/^<\d+>/, "").trim();
  const match = cleaned.match(/^([A-Z][a-z]{2}\s+\d{1,2}\s+\d{4}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.*)$/);

  if (!match) {
    return null;
  }

  return {
    timestampText: match[1],
    deviceName: match[2],
    body: match[3]
  };
}

function parseHuaweiLoginEvent(envelope, rawMessage) {
  if (!envelope.body.includes("%%01SSLVPN/6/USERLOGINSUCC")) {
    return null;
  }

  const cid = extractField(envelope.body, /CID=([^;]+);/);
  const username = extractField(envelope.body, /User Name=([^,)\r\n]+)/);

  if (!username) {
    throw new Error("USERLOGINSUCC is missing User Name.");
  }

  return {
    eventType: "login",
    payload: {
      source: "huawei_syslog",
      username,
      sessionId: cid,
      cid,
      loginTime: parseSyslogTimestamp(envelope.timestampText),
      assignedIp: extractField(envelope.body, /Virtual IP=\s*([^,)\r\n]+)/),
      clientIp: extractField(envelope.body, /Client IP=\s*([^,)\r\n]+)/),
      gatewayName: extractField(envelope.body, /VGName=([^,)\r\n]+)/),
      nasIp: null,
      metadata: {
        deviceName: envelope.deviceName
      },
      rawLoginLog: rawMessage
    }
  };
}

function parseHuaweiLogoutEvent(envelope, rawMessage) {
  if (!envelope.body.includes("%%01SSLVPN/6/USERLOGOUT")) {
    return null;
  }

  const cid = extractField(envelope.body, /CID=([^;]+);/);
  const username = extractField(envelope.body, /User Name=([^,)\r\n]+)/);

  if (!username && !cid) {
    throw new Error("USERLOGOUT is missing both User Name and CID.");
  }

  return {
    eventType: "logout",
    payload: {
      source: "huawei_syslog",
      username,
      sessionId: cid,
      cid,
      logoutTime: parseSyslogTimestamp(envelope.timestampText),
      inputBytes: extractField(envelope.body, /Obverse Bytes=\s*(\d+)/),
      outputBytes: extractField(envelope.body, /Reverse Bytes=\s*(\d+)/),
      metadata: {
        deviceName: envelope.deviceName,
        logoutReason: extractField(envelope.body, /Logout Reason=([^.)\r\n]+)/)
      },
      rawLogoutLog: rawMessage
    }
  };
}

export function parseHuaweiSyslogMessage(rawMessage) {
  const envelope = parseEnvelope(rawMessage);

  if (!envelope) {
    return null;
  }

  return parseHuaweiLoginEvent(envelope, rawMessage) || parseHuaweiLogoutEvent(envelope, rawMessage);
}

async function handleParsedEvent(parsedEvent) {
  if (parsedEvent.eventType === "login") {
    await recordHuaweiSessionLogin(parsedEvent.payload);
    return;
  }

  await recordHuaweiSessionLogout(parsedEvent.payload);
}

export function startHuaweiSyslogListener() {
  if (config.sessions.source !== "huawei" || !config.sessions.huawei.syslog.enabled) {
    return null;
  }

  // UDP is used because this listener consumes raw Huawei syslog packets directly.
  const socket = dgram.createSocket("udp4");

  socket.on("error", (error) => {
    console.error(`[syslog] Huawei listener error: ${error.message}`);
  });

  socket.on("message", async (messageBuffer, remoteInfo) => {
    const rawMessage = messageBuffer.toString("utf8").trim();

    if (!rawMessage) {
      return;
    }

    if (!rememberEvent(rawMessage)) {
      return;
    }

    let parsedEvent;

    try {
      parsedEvent = parseHuaweiSyslogMessage(rawMessage);
    } catch (error) {
      console.warn(`[syslog] Parse error from ${remoteInfo.address}: ${error.message}`);
      return;
    }

    if (!parsedEvent) {
      if (config.sessions.huawei.syslog.logIgnoredMessages) {
        console.log(`[syslog] Ignored message from ${remoteInfo.address}: ${rawMessage}`);
      }
      return;
    }

    try {
      await handleParsedEvent(parsedEvent);
      console.log(
        `[syslog] ${parsedEvent.eventType} ${parsedEvent.payload.username || parsedEvent.payload.cid || "unknown"} from ${remoteInfo.address}`
      );
    } catch (error) {
      console.error(`[syslog] Failed to persist ${parsedEvent.eventType} event: ${error.message}`);
    }
  });

  socket.bind(config.sessions.huawei.syslog.port, config.sessions.huawei.syslog.host, () => {
    console.log(
      `[syslog] Huawei listener ready on udp://${config.sessions.huawei.syslog.host}:${config.sessions.huawei.syslog.port}`
    );
  });

  return socket;
}
