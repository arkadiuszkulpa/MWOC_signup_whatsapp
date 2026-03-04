// API base URL — set via environment variable or defaults to localhost
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }

  return { status: response.status, data };
}

export async function searchParticipant(query) {
  return request("/participants/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function createParticipant({ name, email, phone }) {
  return request("/participants", {
    method: "POST",
    body: JSON.stringify({ name, email, phone }),
  });
}

export async function sendWhatsAppInvite(participant) {
  return request("/notify", {
    method: "POST",
    body: JSON.stringify(participant),
  });
}
