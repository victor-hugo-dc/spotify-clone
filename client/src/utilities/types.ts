// The parts of Spotify Web API objects that Shoutify reads.
export type Image = { url: string };

export type User = { id: string; type: "user"; uri: string; display_name: string | null; images?: Image[] };

export type Artist = { id: string; type: "artist"; uri: string; name: string; images?: Image[] };

export type Album = {
  id: string;
  type: "album";
  uri: string;
  name: string;
  album_type: string;
  artists: Artist[];
  images: Image[];
  release_date: string;
};

export type Track = {
  id: string;
  type: "track";
  uri: string;
  name: string;
  duration_ms: number;
  explicit: boolean;
  artists: Artist[];
  album?: Album; // missing on an album's own track list
};

export type Playlist = {
  id: string;
  type: "playlist";
  uri: string;
  name: string;
  description: string | null;
  images: Image[] | null;
  owner: User;
  primary_color?: string | null;
  followers?: { total: number };
  public?: boolean | null;
};

export type Paging<T> = { items: T[]; next: string | null; total?: number };

// An album in Your Library (/me/albums).
export type SavedAlbum = { added_at: string; album: Album };

// A play from /me/player/recently-played: `context` is the playlist, album or artist it was played from, if any.
export type PlayHistory = { track: Track; played_at: string; context: { type: string; uri: string } | null };

// A card that only links somewhere in the app, like Liked Songs on the home page.
export type LinkCard = { type: "link"; id: string; name: string; description: string; images: Image[]; to: string };

export type CardItem = Playlist | Album | Artist | Track | LinkCard;

// Shoutify's own records, as the server returns them.
type Authored = { id: number; authorID: string; authorName: string; authorImage: string | null; songID: string; timestamp: number };

// createdAt: when it was posted (ms since 1970), null on comments from before Shoutify kept that. parentID: the comment
// it replies to, null on a top-level one. likes and replies: how many it has; liked: whether you like it.
export type SongComment = Authored & {
  commentBody: string;
  songName: string | null;
  songArtist: string | null;
  songImage: string | null;
  createdAt: number | null;
  parentID: number | null;
  likes: number;
  liked: boolean;
  replies: number;
};

export type SongAnnotation = Authored & { annotatedText: string; noteBody: string };

// The song a new comment or annotation is about, where in it (ms), and how long it is (ms).
export type CommentSong = { id: string; name: string; artist: string; image: string | null; position: number; duration: number };

export const commentSong = (track: Track, position = 0): CommentSong => ({
  id: track.id,
  name: track.name,
  artist: track.artists.map((artist) => artist.name).join(", "),
  image: track.album?.images.at(-1)?.url ?? null,
  position,
  duration: track.duration_ms,
});
