async function request(path, options = {}) {
  // All browser requests include cookies because auth is cookie-based.
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // The backend already sends user-friendly messages, so surface them directly.
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  patch: (path, body) =>
    request(path, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  delete: (path) =>
    request(path, {
      method: "DELETE"
    })
};
