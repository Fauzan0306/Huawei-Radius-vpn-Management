import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

function escapeRadiusValue(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

export async function disconnectRadiusUser({
  username = "",
  sessionId = "",
  assignedIp = "",
  clientIp = "",
  includeCallingStationId = false
}) {
  if (!config.radius.nasIp || !config.radius.coaSecret) {
    throw new Error("RADIUS_NAS_IP and RADIUS_COA_SECRET must be configured to use the disconnect feature.");
  }

  // Build only the attributes that are available for the current session source.
  const attributes = [];

  if (username) {
    attributes.push(`User-Name="${escapeRadiusValue(username)}"`);
  }

  if (sessionId) {
    attributes.push(`Acct-Session-Id="${escapeRadiusValue(sessionId)}"`);
  }

  if (assignedIp) {
    attributes.push(`Framed-IP-Address="${escapeRadiusValue(assignedIp)}"`);
  }

  if (includeCallingStationId && clientIp) {
    attributes.push(`Calling-Station-Id="${escapeRadiusValue(clientIp)}"`);
  }

  if (attributes.length === 0) {
    throw new Error("At least one session identifier is required to disconnect a user.");
  }

  const echoInput = attributes.join(", ");
  const nasAddress = `${config.radius.nasIp}:${config.radius.coaPort}`;

  try {
    // radclient performs the actual CoA/Disconnect-Request to the NAS or firewall.
    const { stdout } = await execFileAsync("radclient", ["-x", nasAddress, "disconnect", config.radius.coaSecret], {
      encoding: "utf8",
      timeout: 5000,
      input: echoInput + "\n"
    });

    if (stdout.includes("Disconnect-NAK")) {
      throw new Error("NAS rejected the disconnect request (Disconnect-NAK).");
    }

    if (!stdout.includes("Disconnect-ACK")) {
      throw new Error(`Unexpected response from NAS: ${stdout.trim()}`);
    }

    return true;
  } catch (error) {
    if (error.message.includes("Disconnect-NAK") || error.message.includes("Unexpected response")) {
      throw error;
    }
    throw new Error(`Failed to execute radclient: ${error.message}`);
  }
}
