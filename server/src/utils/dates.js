import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);

const RADIUS_FORMAT = "DD MMM YYYY";
const EXPIRING_WINDOW_DAYS = 7;

export function parseRadiusDate(value) {
  if (!value) {
    return null;
  }

  // Support both native RADIUS format and a couple of helper formats used by the UI.
  const parsed = dayjs(value, [RADIUS_FORMAT, "YYYY-MM-DD", "YYYY/MM/DD"], true);
  return parsed.isValid() ? parsed : null;
}

export function toRadiusDate(value) {
  if (!value) {
    return null;
  }

  const parsed = dayjs(value, "YYYY-MM-DD", true);
  if (!parsed.isValid()) {
    throw new Error("Invalid expiration date format. Expected YYYY-MM-DD.");
  }

  return parsed.format(RADIUS_FORMAT);
}

export function toInputDate(value) {
  const parsed = parseRadiusDate(value);
  return parsed ? parsed.format("YYYY-MM-DD") : "";
}

export function getAccountStatus(value) {
  return getExpirationMeta(value).status;
}

export function getExpirationMeta(value) {
  const parsed = parseRadiusDate(value);

  if (!parsed) {
    // No expiration means the account should be treated as active.
    return {
      status: "active",
      statusLabel: "Account Active",
      daysUntilExpiration: null
    };
  }

  // System timezone is now natively WITA (GMT+8).
  // We can safely rely on local time.
  const today = dayjs().startOf("day");
  const expires = dayjs(parsed).startOf("day");
  const daysUntilExpiration = expires.diff(today, "day");

  if (expires.isBefore(today)) {
    return {
      status: "expired",
      statusLabel: "Account Expired",
      daysUntilExpiration
    };
  }

  if (daysUntilExpiration <= EXPIRING_WINDOW_DAYS) {
    return {
      status: "expiring",
      statusLabel: `Account Expiring (H-${daysUntilExpiration})`,
      daysUntilExpiration
    };
  }

  return {
    status: "active",
    statusLabel: "Account Active",
    daysUntilExpiration
  };
}

export function formatDuration(seconds) {
  // Keep duration output compact because it is reused in dense tables/cards.
  const total = Number(seconds || 0);

  if (!total) {
    return "0m";
  }

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}
