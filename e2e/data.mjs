// The fake Spotify account the smoke test signs in with: API answers by path, plus a cover image for any URL.
// Cover URLs look like Spotify's (the server only accepts these as comment images); each number draws a different colour.
export const img = (n) => [{ url: `https://i.scdn.co/image/ab67616d0000b273${n.toString(16).padStart(24, "0")}`, height: 640, width: 640 }];
export const artist = { id: "ar1", name: "Artist One", type: "artist", uri: "spotify:artist:ar1", images: img(1), genres: [] };
export const album = { id: "al1", name: "Album One", type: "album", album_type: "album", uri: "spotify:album:al1", images: img(2), artists: [artist], release_date: "2024-01-01" };
export const track = { id: "4uLU6hMCjMI75M1A2tKUQC", name: "Track One", type: "track", uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC", duration_ms: 200000, explicit: false, album, artists: [artist] };
export const me = { id: "victor", display_name: "Victor", type: "user", uri: "spotify:user:victor", images: img(3) };
export const track2 = { ...track, id: "TrackTwo00000000000000", name: "Track Two", uri: "spotify:track:TrackTwo00000000000000" };
export const listed = Array.from({ length: 30 }, (_, i) => ({ ...track, id: `ListedTrack${String(i).padStart(11, "0")}`, name: `Listed ${i}`, uri: `spotify:track:ListedTrack${String(i).padStart(11, "0")}`, album: { ...album, images: img(100 + i) } }));
export const page1 = { items: listed.map((t) => ({ item: t, track: t })), next: "https://api.spotify.com/v1/playlists/p1/items?offset=30", total: 31 };
export const page2 = { items: [{ item: track2, track: track2 }], next: null, total: 31 };
export const playlist = { id: "p1", name: "Mix", type: "playlist", uri: "spotify:playlist:p1", images: img(4), description: "Rock &amp; roll, see <a href=\"spotify:playlist:p2\">part two</a>", owner: me, primary_color: null, followers: { total: 1 }, items: page1, tracks: page1 };
export const searchItems = { track: [track], artist: [artist], album: [album], playlist: [playlist, null] };

export const fixtures = {
  "/v1/me": me,
  "/v1/me/playlists": { items: [playlist], next: null },
  "/v1/me/player": { is_playing: true, progress_ms: 1000, repeat_state: "off", shuffle_state: false, item: listed[3], context: { uri: "spotify:playlist:p1" }, device: { volume_percent: 50 } },
  "/v1/me/player/currently-playing": { progress_ms: 1000, item: track },
  "/v1/me/player/devices": { devices: [] },
  "/v1/playlists/p1": playlist,
  "/v1/playlists/p1/items": page2,
  "/v1/playlists/p3": { ...playlist, id: "p3", name: "My Playlist #2", uri: "spotify:playlist:p3", description: "", items: { items: [], next: null } },
  "/v1/playlists/p2": { ...playlist, id: "p2", name: "Someone Else's Mix", uri: "spotify:playlist:p2", owner: { id: "bob", display_name: "Bob", type: "user", uri: "spotify:user:bob" }, items: undefined, tracks: undefined },
  "/v1/playlists/p1/tracks": page2,
  "/v1/albums/al1": { ...album, tracks: { items: [track], next: null } },
  "/v1/artists/ar1": artist,
  "/v1/artists/ar1/albums": { items: [album], next: null },
  "/v1/me/following": { artists: { items: [artist], next: null } },
  "/v1/me/following/contains": [false],
  "/v1/me/library/contains": [false],
  "/v1/me/albums": { items: [{ album }], next: null },
  "/v1/me/tracks": { items: [{ track }], next: null },
  "/v1/me/top/artists": { items: [artist], next: null },
  "/v1/me/top/tracks": { items: [track], next: null },
  [`/v1/tracks/${track.id}`]: track,
  "/v1/tracks/QuietTrack000000000000": { ...track, id: "QuietTrack000000000000", name: "Quiet Track" },
  "/v1/users/victor": me,
  "/v1/users/victor/playlists": { items: [playlist], total: 1, next: null },
};


export const cover = (url) => {
  const hue = [...url].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},60%,25%)"/>` +
    `</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/></svg>`;
};
