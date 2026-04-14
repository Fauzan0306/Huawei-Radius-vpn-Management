import { Router } from "express";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { listSessions } from "../services/sessions.js";
import { disconnectRadiusUser } from "../services/radiusClient.js";
import { pool } from "../db.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    // Filters come from the session log page and are normalized here once.
    const rows = await listSessions({
      username: req.query.username?.trim() || "",
      dateFrom: req.query.dateFrom?.trim() || "",
      dateTo: req.query.dateTo?.trim() || "",
      activeOnly: req.query.activeOnly === "true",
      timezoneOffsetMinutes: Number.parseInt(
        req.query.timezoneOffsetMinutes || String(config.appTimezoneOffsetMinutes),
        10
      )
    });

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/disconnect", async (req, res, next) => {
  try {
    const { id } = req.params;
    let disconnectPayload;

    if (config.sessions.source === "huawei") {
      // Huawei sessions are tracked locally in vpn_sessions and disconnected by IP.
      const [rows] = await pool.query(
        `
          SELECT username, cid, assigned_ip, client_ip
          FROM vpn_sessions
          WHERE id = ? AND logout_time IS NULL
        `,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Active session not found or already closed." });
      }

      const row = rows[0];

      // Huawei syslog CIDs in this deployment are not reliable enough to use
      // as the primary Disconnect-Request matcher, so prefer the assigned IP.
      disconnectPayload = {
        username: row.username,
        assignedIp: row.assigned_ip,
        sessionId: "",
        clientIp: row.client_ip,
        includeCallingStationId: false
      };
    } else {
      const [rows] = await pool.query(
        `
          SELECT username, acctsessionid, framedipaddress
          FROM radacct
          WHERE radacctid = ? AND acctstoptime IS NULL
        `,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ message: "Active session not found or already closed." });
      }

      const row = rows[0];
      disconnectPayload = {
        username: row.username,
        sessionId: row.acctsessionid,
        assignedIp: row.framedipaddress
      };
    }

    // The actual disconnect request is delegated to radclient/CoA.
    await disconnectRadiusUser(disconnectPayload);
    res.json({ success: true, message: "Disconnect command sent to firewall." });
  } catch (error) {
    next(error);
  }
});

export default router;
