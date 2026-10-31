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
};

export type Paging<T> = { items: T[]; next: string | null; total?: number };

// A card that only links somewhere in the app, like Liked Songs on the home page.
export type LinkCard = { type: "link"; id: string; name: string; description: string; images: Image[]; to: string };

export type CardItem = Playlist | Album | Artist | Track | LinkCard;
