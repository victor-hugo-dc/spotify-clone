// Preloaded into the test server: Spotify's token endpoint and /v1/me answer for the fake session.
const real = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (url === "https://accounts.spotify.com/api/token") return Response.json({ access_token: "fake-token", expires_in: 3600 });
  if (url === "https://api.spotify.com/v1/me") return Response.json({ id: "victor", display_name: "Victor", images: [] });
  return real(input, init);
};
