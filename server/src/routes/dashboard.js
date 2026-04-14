import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { countActiveSessions, listActiveSessions } from "../services/sessions.js";
import { getAccountStatus } from "../utils/dates.js";

const router = Router();

router.use(requireAuth);

router.get("/stats", async (_req, res, next) => {
  try {
    const [[{ totalUsers }]] = await pool.query(
      `
        SELECT COUNT(DISTINCT username) AS totalUsers
        FROM radcheck
      `
    );

    const activeSessions = await countActiveSessions();

    const [expirationRows] = await pool.query(
      `
        SELECT value
        FROM radcheck
        WHERE attribute = 'Expiration'
      `
    );

    const expiredAccounts = expirationRows.filter((row) => getAccountStatus(row.value) === "expired").length;

    const [recentUsers] = await pool.query(
      `
        SELECT username, value AS passwordValue, id
        FROM radcheck
        WHERE attribute = 'Cleartext-Password'
        ORDER BY id DESC
        LIMIT 5
      `
    );

    res.json({
      totalUsers,
      activeSessions,
      expiredAccounts,
      recentUsers: recentUsers.map((user) => ({
        username: user.username,
        id: user.id
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/active-sessions", async (_req, res, next) => {
  try {
    const rows = await listActiveSessions(5);

    res.json(rows);
  } catch (error) {
    next(error);
  }
});

export default router;
