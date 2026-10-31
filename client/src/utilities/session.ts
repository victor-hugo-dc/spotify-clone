// The logged-in user's Spotify access token. The server keeps the refresh token in an httpOnly cookie and trades it
// for access tokens at /api/token. Callers ask for the token when they make a request, never keep it, so a refresh
// reaches every caller at once (long-running timers and SDK callbacks included).
type Session = { token: string; expiresAt: number };

let session: Session | null = null;
let pending: Promise<Session | null> | null = null;

// Concurrent callers share one request. Resolves to null when nobody is logged in.
export function refreshSession(): Promise<Session | null> {
  pending ??= fetch("/api/token")
    .then(async (response) => {
      if (response.status === 401) return (session = null);
      if (!response.ok) throw Object.assign(new Error(`Couldn't refresh the Spotify login (${response.status})`), { status: response.status });
      const { access_token, expires_in }: { access_token: string; expires_in: number } = await response.json();
      return (session = { token: access_token, expiresAt: Date.now() + expires_in * 1000 });
    })
    .finally(() => (pending = null));
  return pending;
}

// A token good for at least another minute. Checking the clock here also covers a laptop that slept through the hour.
export async function accessToken(): Promise<string | null> {
  if (session && session.expiresAt - Date.now() > 60 * 1000) return session.token;
  return (await refreshSession())?.token ?? null;
}
