// The fake Spotify account the smoke test signs in with: API answers by path, plus a cover image for any URL.
// Cover URLs look like Spotify's (the server only accepts these as comment images); each number draws a different colour.
export const img = (n) => [{ url: `https://i.scdn.co/image/ab67616d0000b273${n.toString(16).padStart(24, "0")}`, height: 640, width: 640 }];
// A time this long ago, so "Date added" and "played" columns read "14 hours ago", "3 days ago"... whenever the test runs.
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();
// Spotify ids are 22 characters.
const id22 = (s) => s.padEnd(22, "0");

export const artist = { id: "ar1", name: "Artist One", type: "artist", uri: "spotify:artist:ar1", images: img(1), genres: [] };
export const album = { id: "al1", name: "Album One", type: "album", album_type: "album", uri: "spotify:album:al1", images: img(2), artists: [artist], release_date: "2024-01-01" };
export const track = { id: "4uLU6hMCjMI75M1A2tKUQC", name: "Track One", type: "track", uri: "spotify:track:4uLU6hMCjMI75M1A2tKUQC", duration_ms: 200000, explicit: false, album, artists: [artist] };
export const me = { id: "victor", display_name: "Victor", type: "user", uri: "spotify:user:victor", images: img(3) };
export const track2 = { ...track, id: "TrackTwo00000000000000", name: "Track Two", uri: "spotify:track:TrackTwo00000000000000" };
export const listed = Array.from({ length: 30 }, (_, i) => ({ ...track, id: `ListedTrack${String(i).padStart(11, "0")}`, name: `Listed ${i}`, uri: `spotify:track:ListedTrack${String(i).padStart(11, "0")}`, album: { ...album, images: img(100 + i) } }));
// Playlist entries, added from 14 hours to over a year ago.
const entry = (t, i) => ({ added_at: ago((14 + i * i * 12) * HOUR), item: t, track: t });
export const page1 = { items: listed.map(entry), next: "https://api.spotify.com/v1/playlists/p1/items?offset=30", total: 31 };
export const page2 = { items: [entry(track2, 30)], next: null, total: 31 };
export const playlist = { id: "p1", name: "Mix", type: "playlist", uri: "spotify:playlist:p1", images: img(4), description: "Rock &amp; roll, see <a href=\"spotify:playlist:p2\">part two</a>", owner: me, primary_color: null, followers: { total: 1 }, items: page1, tracks: page1 };
export const searchItems = { track: [track], artist: [artist], album: [album], playlist: [playlist, null] };

// A second artist with an album and a single, for shelves, cards and the library.
export const artist2 = { id: "ar2", name: "Artist Two", type: "artist", uri: "spotify:artist:ar2", images: img(5), genres: [] };
export const album2 = { id: "al2", name: "Album Two", type: "album", album_type: "album", uri: "spotify:album:al2", images: img(6), artists: [artist2], release_date: "2023-06-09" };
export const album3 = { id: "al3", name: "Single Three", type: "album", album_type: "single", uri: "spotify:album:al3", images: img(7), artists: [artist, artist2], release_date: "2025-02-14" };
const song = (name, al, i, extra = {}) => ({ ...track, id: id22(`${al.id}Song${i}`), name, uri: `spotify:track:${id22(`${al.id}Song${i}`)}`, duration_ms: 150000 + i * 41000, album: al, artists: al.artists, ...extra });
export const album2Songs = [song("Opening Night", album2, 1), song("Second Wind", album2, 2, { explicit: true }), song("Slow Fade", album2, 3)];
export const single = song("Single Three", album3, 1);

const bob = { id: "bob", display_name: "Bob", type: "user", uri: "spotify:user:bob" };
// Your own playlists list their tracks; others' don't (Development Mode apps only get the contents of playlists you own).
const ownPlaylist = (id, name, images, tracks) => ({
  ...playlist, id, name, uri: `spotify:playlist:${id}`, images, description: "",
  items: { items: tracks.map(entry), next: null, total: tracks.length }, tracks: undefined,
});
export const playlists = [
  playlist,
  ownPlaylist("p4", "Road Trip", img(9), listed.slice(0, 6)),
  ownPlaylist("p5", "Late Night", img(10), [...album2Songs, single]),
  { ...playlist, id: "p2", name: "Someone Else's Mix", uri: "spotify:playlist:p2", images: img(8), owner: bob, items: undefined, tracks: undefined },
  ownPlaylist("p6", "Workout", null, listed.slice(6, 10)),
  ownPlaylist("p7", "Chill", img(11), listed.slice(10, 14)),
  ownPlaylist("p8", "Throwbacks", img(12), listed.slice(14, 20)),
  ownPlaylist("p9", "Focus", img(13), []),
];

// Liked Songs, newest first, from 14 hours ago to last year.
const liked = [
  { added_at: ago(14 * HOUR), track },
  { added_at: ago(3 * DAY), track: album2Songs[1] },
  { added_at: ago(15 * DAY), track: single },
  { added_at: "2025-09-03T12:00:00Z", track: listed[5] },
];
const context = (type, uri) => ({ type, uri, href: `https://api.spotify.com/v1/${type}s/${uri.split(":")[2]}`, external_urls: { spotify: `https://open.spotify.com/${type}/${uri.split(":")[2]}` } });
// Recently played, newest first: from a playlist, an album, an artist and nothing (a single song).
export const recentlyPlayed = [
  { track: listed[2], played_at: ago(10 * 60 * 1000), context: context("playlist", "spotify:playlist:p1") },
  { track: album2Songs[0], played_at: ago(2 * HOUR), context: context("album", "spotify:album:al2") },
  { track, played_at: ago(5 * HOUR), context: context("artist", "spotify:artist:ar1") },
  { track: single, played_at: ago(DAY), context: null },
  { track: listed[1], played_at: ago(2 * DAY), context: context("playlist", "spotify:playlist:p4") },
];
// Victor is listening on his phone, so the in-browser player isn't the active device.
const phone = { id: "phone-1", name: "Victor's iPhone", volume_percent: 50 };

export const fixtures = {
  "/v1/me": me,
  "/v1/me/playlists": { items: playlists, next: null, total: playlists.length },
  "/v1/me/player": { is_playing: true, progress_ms: 1000, repeat_state: "off", shuffle_state: false, item: listed[3], context: { uri: "spotify:playlist:p1" }, device: phone },
  "/v1/me/player/currently-playing": { progress_ms: 1000, item: track },
  "/v1/me/player/devices": { devices: [{ ...phone, type: "Smartphone", is_active: true }] },
  "/v1/me/player/queue": { currently_playing: listed[3], queue: [...listed.slice(4, 7), album2Songs[0], single] },
  "/v1/me/player/recently-played": { items: recentlyPlayed, next: null, cursors: null },
  "/v1/playlists/p1": playlist,
  "/v1/playlists/p1/items": page2,
  "/v1/playlists/p3": { ...playlist, id: "p3", name: "My Playlist #9", uri: "spotify:playlist:p3", description: "", images: null, items: { items: [], next: null } },
  ...Object.fromEntries(playlists.filter((p) => p.id !== "p1").map((p) => [`/v1/playlists/${p.id}`, p])),
  "/v1/playlists/p1/tracks": page2,
  "/v1/albums/al1": { ...album, tracks: { items: [track], next: null } },
  "/v1/albums/al2": { ...album2, tracks: { items: album2Songs, next: null } },
  "/v1/albums/al3": { ...album3, tracks: { items: [single], next: null } },
  "/v1/artists/ar1": artist,
  "/v1/artists/ar1/albums": { items: [album, album3], next: null },
  "/v1/artists/ar2": artist2,
  "/v1/artists/ar2/albums": { items: [album2, album3], next: null },
  "/v1/me/following": { artists: { items: [artist, artist2], next: null, total: 2 } },
  "/v1/me/following/contains": [false],
  "/v1/me/library/contains": [false],
  "/v1/me/albums": { items: [{ added_at: ago(DAY), album: album3 }, { added_at: ago(9 * DAY), album: album2 }, { added_at: ago(40 * DAY), album }], next: null, total: 3 },
  "/v1/me/tracks": { items: liked, next: null, total: liked.length },
  "/v1/me/top/artists": { items: [artist, artist2], next: null },
  "/v1/me/top/tracks": { items: [track, ...album2Songs, single, ...listed.slice(0, 4)], next: null },
  [`/v1/tracks/${track.id}`]: track,
  "/v1/tracks/QuietTrack000000000000": { ...track, id: "QuietTrack000000000000", name: "Quiet Track" },
  "/v1/users/victor": me,
  "/v1/users/victor/playlists": { items: [playlist], total: 1, next: null },
};


export const cover = (url) => {
  // FNV-1a hash with murmur3's finalizer, so covers whose URLs differ in one digit still get far-apart colours.
  let h = [...url].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  const hue = ((h ^ (h >>> 16)) >>> 0) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><defs><linearGradient id="g" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},70%,55%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360},60%,25%)"/>` +
    `</linearGradient></defs><rect width="300" height="300" fill="url(#g)"/></svg>`;
};
