import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

function toDisplayName(username) {
  return String(username || "")
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAdminProfile(username) {
  return {
    username,
    displayName: config.adminDisplayName || toDisplayName(username) || username,
    email: config.adminEmail || ""
  };
}

function validatePassword(input) {
  if (config.adminPasswordHash) {
    return bcrypt.compareSync(input, config.adminPasswordHash);
  }

  return input === config.adminPassword;
}

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Admin login is intentionally env-based for this project version.
  if (username !== config.adminUsername || !validatePassword(password || "")) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ username }, config.jwtSecret, { expiresIn: "8h" });

  // The frontend relies on an HTTP-only cookie instead of storing tokens in localStorage.
  res.cookie("vpn_admin_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 8 * 60 * 60 * 1000
  });

  return res.json(getAdminProfile(username));
});

router.get("/me", requireAuth, (req, res) => {
  res.json(getAdminProfile(req.admin.username));
});

router.post("/logout", requireAuth, (req, res) => {
  // Clear the auth cookie so route guards will redirect back to /login.
  res.clearCookie("vpn_admin_token");
  res.status(204).send();
});

export default router;
