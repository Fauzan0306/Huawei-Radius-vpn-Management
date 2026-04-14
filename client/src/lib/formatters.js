export function formatDate(value) {
  if (!value) {
    return "-";
  }

  // Use a single locale style across the app so tables and cards read consistently.
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium"
  }).format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatDuration(seconds) {
  // Compact duration labels fit better inside dashboard cards and log tables.
  const total = Math.max(0, Math.trunc(Number(seconds || 0)));

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
