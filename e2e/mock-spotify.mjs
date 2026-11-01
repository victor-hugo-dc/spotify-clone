// Preloaded into the test server: Spotify's token endpoint, /v1/me and the follow check answer for the fake sessions.
// Each refresh cookie logs in as someone: the browser's ("good-refresh", or any other) as Victor, "ana-refresh" as Ana and
// "bo-refresh" as Bo. On Spotify, Victor follows Ana, not Bo.
import { img } from "./data.mjs";

const people = {
  victor: { id: "victor", display_name: "Victor", images: [] },
  ana: { id: "ana", display_name: "Ana", images: img(200) },
  bo: { id: "bo", display_name: "Bo", images: [] },
};
const follows = { victor: ["ana"] };
const real = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input));
  // Access tokens are "fake-<id>".
  const who = new Headers(init?.headers).get("authorization")?.replace("Bearer fake-", "") ?? "";
  if (url.href === "https://accounts.spotify.com/api/token") {
    const refresh = new URLSearchParams(String(init?.body)).get("refresh_token") ?? "";
    return Response.json({ access_token: `fake-${people[refresh.replace(/-refresh$/, "")]?.id ?? "victor"}`, expires_in: 3600 });
  }
  if (url.href === "https://api.spotify.com/v1/me") return Response.json(people[who]);
  if (url.origin + url.pathname === "https://api.spotify.com/v1/me/library/contains")
    return Response.json(url.searchParams.get("uris").split(",").map((uri) => follows[who]?.includes(uri.replace("spotify:user:", "")) ?? false));
  return real(input, init);
};
