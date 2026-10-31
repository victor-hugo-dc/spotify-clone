// Calls Shoutify's own server, which checks the Spotify token to know who is asking.
export async function api<T>(path: string, token: string | null, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Shoutify answered ${response.status}`);
  return response.json();
}
