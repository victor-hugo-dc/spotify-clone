// Calls Shoutify's own server. The httpOnly author cookie set at login says who is asking.
export async function api<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Shoutify answered ${response.status}`);
  return response.json();
}
