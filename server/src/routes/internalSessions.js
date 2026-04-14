import { Router } from "express";
import { requireIngestToken } from "../middleware/internalAuth.js";
import {
  ensureHuaweiSessionsTable,
  recordHuaweiSessionLogin,
  recordHuaweiSessionLogout
} from "../services/huaweiSessions.js";

const router = Router();

// These routes are intended for trusted internal ingest sources only.
router.use(requireIngestToken);

router.post("/login", async (req, res, next) => {
  try {
    const session = await recordHuaweiSessionLogin(req.body);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const session = await recordHuaweiSessionLogout(req.body);

    if (!session) {
      return res.status(404).json({ message: "No active session matched the logout event." });
    }

    return res.json(session);
  } catch (error) {
    next(error);
  }
});

router.post("/ensure-table", async (_req, res, next) => {
  try {
    // Handy endpoint for first-time deployment or ops validation.
    await ensureHuaweiSessionsTable();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
