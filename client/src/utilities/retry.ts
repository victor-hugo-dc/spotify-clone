// Calls `load` again when it fails because Spotify is busy (429), failing (5xx) or out of reach (no status), after
// each of `waits` (ms) in turn. Other errors (logged out, forbidden, not found) won't change by asking again.
// shortcut: a 429 waits like a 5xx, ignoring Retry-After (spotify() doesn't pass it on, and Spotify sends no
// Access-Control-Expose-Headers, so browsers can't read it); use it if that changes.
export async function retried<T>(load: () => Promise<T>, waits = [2000, 10000]): Promise<T> {
  for (const wait of waits) {
    try {
      return await load();
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== undefined && status !== 429 && status < 500) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  return load();
}
