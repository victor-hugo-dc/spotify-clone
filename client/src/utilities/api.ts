import { refreshSession } from "./session.ts";

// Calls Shoutify's own server. The httpOnly author cookie, renewed by each token refresh, says who is asking.
export async function api<T>(path: string, body?: object): Promise<T> {
  const send = () =>
    fetch(`/api${path}`, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body && JSON.stringify(body),
    });
  let response = await send();
  // The author cookie lasts two hours; a token refresh renews it.
  if (response.status === 401 && (await refreshSession())) response = await send();
  if (!response.ok) throw new Error(`Shoutify answered ${response.status}`);
  return response.json();
}
