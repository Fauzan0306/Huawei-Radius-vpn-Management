import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function requireAuth(req, res, next) {
  // Admin auth is stored in an HTTP-only cookie set by /api/auth/login.
  const token = req.cookies?.vpn_admin_token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Attach the decoded admin identity so downstream routes do not re-verify.
    req.admin = jwt.verify(token, config.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}
