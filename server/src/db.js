import mysql from "mysql2/promise";
import { config } from "./config.js";

// Shared MariaDB pool for the whole backend.
export const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});
