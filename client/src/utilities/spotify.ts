// Calls the Spotify Web API as the logged-in user. `path` is relative to /v1;
// full URLs (the `next` links of paged results) are used as they are.
export async function spotify<T = undefined>(
  path: string,
  token: string | null,
  { method = "GET", body, signal }: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  try {
    const response = await fetch(path.startsWith("https://") ? path : `https://api.spotify.com/v1${path}`, {
      method,
      signal,
      headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text(); // player commands answer 204 with no body
    const data = text ? JSON.parse(text) : undefined;
    if (!response.ok) throw Object.assign(new Error(data?.error?.message ?? `Spotify answered ${response.status}`), { status: response.status });
    return data as T;
  } catch (error) {
    // A cancelled request (its component unmounted or moved on) never settles, so callers need no abort checks.
    if (signal?.aborted) return new Promise<never>(() => {});
    throw error;
  }
}

// Player commands answer 404 when no device is active; then they go to `deviceId` (this browser's player) instead.
export async function playerCommand(path: string, token: string | null, deviceId: string | null, init: { method: string; body?: unknown }) {
  try {
    return await spotify(path, token, init);
  } catch (error) {
    if ((error as { status?: number }).status !== 404 || !deviceId) throw error;
    return spotify(`${path}${path.includes("?") ? "&" : "?"}device_id=${deviceId}`, token, init);
  }
}
