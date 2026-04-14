import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  createUser,
  deleteUser,
  getUserByUsername,
  listUsers,
  resetPassword,
  updateUser
} from "../services/users.js";

const router = Router();

router.use(requireAuth);

// Keep usernames compatible with the existing RADIUS schema and operators' habits.
function validateUsername(username) {
  return /^[A-Za-z0-9._@-]+$/.test(username);
}

router.get("/", async (req, res, next) => {
  try {
    const users = await listUsers(req.query.search?.trim() || "");
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { username, password, expirationDate, simultaneousUse, filterId } = req.body;

    // The route validates the minimal shape before service-layer writes begin.
    if (!username || !validateUsername(username)) {
      return res.status(400).json({ message: "Invalid username format" });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    await createUser({
      username,
      password,
      expirationDate: expirationDate || "",
      simultaneousUse: simultaneousUse || "",
      filterId: filterId?.trim() || ""
    });

    const user = await getUserByUsername(username);
    return res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.patch("/:username", async (req, res, next) => {
  try {
    // Username stays immutable in v1; edit mode only changes supporting attributes.
    await updateUser(req.params.username, {
      expirationDate: req.body.expirationDate || "",
      simultaneousUse: req.body.simultaneousUse || "",
      filterId: req.body.filterId?.trim() || ""
    });

    const user = await getUserByUsername(req.params.username);
    return res.json(user);
  } catch (error) {
    next(error);
  }
});

router.post("/:username/reset-password", async (req, res, next) => {
  try {
    const { password } = req.body;

    // Password reset is a dedicated action to avoid accidental edits from the generic form.
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    await resetPassword(req.params.username, password);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.delete("/:username", async (req, res, next) => {
  try {
    await deleteUser(req.params.username);
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
