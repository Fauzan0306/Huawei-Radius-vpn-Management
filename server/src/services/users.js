import { pool } from "../db.js";
import { getExpirationMeta, toInputDate, toRadiusDate } from "../utils/dates.js";

function mapUserRows(rows) {
  const users = new Map();

  for (const row of rows) {
    if (!users.has(row.username)) {
      users.set(row.username, {
        username: row.username,
        expirationDate: "",
        simultaneousUse: "",
        filterId: "",
        hasPassword: false
      });
    }

    const entry = users.get(row.username);

    // A single VPN account is assembled from multiple RADIUS attribute rows.
    if (row.attribute === "Cleartext-Password") {
      entry.hasPassword = true;
    }

    if (row.attribute === "Expiration") {
      entry.expirationDate = toInputDate(row.value);
    }

    if (row.attribute === "Simultaneous-Use") {
      entry.simultaneousUse = row.value;
    }

    if (row.attribute === "Filter-Id") {
      entry.filterId = row.value;
    }
  }

  return Array.from(users.values()).map((user) => {
    const expirationMeta = getExpirationMeta(user.expirationDate);

    return {
      ...user,
      ...expirationMeta
    };
  });
}

export async function listUsers(search = "") {
  const sql = `
    SELECT username, attribute, value, sort_order, row_id
    FROM (
      SELECT username, attribute, value, 1 AS sort_order, id AS row_id
      FROM radcheck
      WHERE (:search = '' OR username LIKE :searchLike)

      UNION ALL

      SELECT username, attribute, value, 2 AS sort_order, id AS row_id
      FROM radreply
      WHERE attribute = 'Filter-Id'
        AND (:search = '' OR username LIKE :searchLike)
    ) attributes
    ORDER BY username ASC, sort_order ASC, row_id ASC
  `;

  const [rows] = await pool.query(sql, {
    search,
    searchLike: `%${search}%`
  });

  // The UI expects one object per username, not raw attribute rows.
  return mapUserRows(rows);
}

export async function getUserByUsername(username) {
  const [rows] = await pool.query(
    `
      SELECT username, attribute, value, sort_order, row_id
      FROM (
        SELECT username, attribute, value, 1 AS sort_order, id AS row_id
        FROM radcheck
        WHERE username = ?

        UNION ALL

        SELECT username, attribute, value, 2 AS sort_order, id AS row_id
        FROM radreply
        WHERE username = ?
          AND attribute = 'Filter-Id'
      ) attributes
      ORDER BY sort_order ASC, row_id ASC
    `,
    [username, username]
  );

  const [user] = mapUserRows(rows);
  return user || null;
}

async function replaceFilterId(connection, username, filterId) {
  // Only keep one Huawei role per user to match the UI model.
  await connection.query(
    "DELETE FROM radreply WHERE username = ? AND attribute = 'Filter-Id'",
    [username]
  );

  if (filterId) {
    await connection.query(
      `
        INSERT INTO radreply (username, attribute, op, value)
        VALUES (?, 'Filter-Id', ':=', ?)
      `,
      [username, filterId]
    );
  }
}

export async function createUser({ username, password, expirationDate, simultaneousUse, filterId }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check both radcheck and radreply so partial legacy rows do not create duplicates.
    const [existingRows] = await connection.query(
      `
        SELECT COUNT(*) AS total
        FROM (
          SELECT username FROM radcheck WHERE username = ?
          UNION ALL
          SELECT username FROM radreply WHERE username = ?
        ) existing_users
      `,
      [username, username]
    );

    if (existingRows[0].total > 0) {
      throw new Error("Username already exists.");
    }

    await connection.query(
      `
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (?, 'Cleartext-Password', ':=', ?)
      `,
      [username, password]
    );

    if (expirationDate) {
      await connection.query(
        `
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (?, 'Expiration', ':=', ?)
        `,
        [username, toRadiusDate(expirationDate)]
      );
    }

    if (simultaneousUse) {
      await connection.query(
        `
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (?, 'Simultaneous-Use', ':=', ?)
        `,
        [username, String(simultaneousUse)]
      );
    }

    await replaceFilterId(connection, username, filterId);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateUser(username, { expirationDate, simultaneousUse, filterId }) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Attributes that behave like single-value fields are easier to replace than patch in place.
    await connection.query(
      "DELETE FROM radcheck WHERE username = ? AND attribute IN ('Expiration', 'Simultaneous-Use')",
      [username]
    );

    if (expirationDate) {
      await connection.query(
        `
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (?, 'Expiration', ':=', ?)
        `,
        [username, toRadiusDate(expirationDate)]
      );
    }

    if (simultaneousUse) {
      await connection.query(
        `
          INSERT INTO radcheck (username, attribute, op, value)
          VALUES (?, 'Simultaneous-Use', ':=', ?)
        `,
        [username, String(simultaneousUse)]
      );
    }

    await replaceFilterId(connection, username, filterId);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function resetPassword(username, password) {
  const [result] = await pool.query(
    `
      UPDATE radcheck
      SET value = ?
      WHERE username = ? AND attribute = 'Cleartext-Password'
    `,
    [password, username]
  );

  if (result.affectedRows === 0) {
    // Older or manually-created accounts may not have a password row yet.
    await pool.query(
      `
        INSERT INTO radcheck (username, attribute, op, value)
        VALUES (?, 'Cleartext-Password', ':=', ?)
      `,
      [username, password]
    );
  }
}

export async function deleteUser(username) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    // Delete from both tables so the account disappears cleanly from the admin UI.
    await connection.query("DELETE FROM radcheck WHERE username = ?", [username]);
    await connection.query("DELETE FROM radreply WHERE username = ?", [username]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
