import React, { useContext, useEffect, useRef, useState, type Ref } from 'react';
import TrackListItem from './TrackListItem';
import Icon from '../icons';
import usePlayback from '../../utilities/hooks/usePlayback';
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader';
import { LibraryContext, MessageContext } from '../../utilities/context';
import { api } from '../../utilities/api';
import { spotify } from '../../utilities/spotify';
import { chunks } from '../../utilities/lists';
import type { Track } from '../../utilities/types';

// A track as a playlist or Liked Songs lists it: with when it was added.
export type Listed = Track & { added_at?: string };

type Props = {
  tracks: (Listed | null)[];
  highlight?: string | null;
  // The album or playlist the tracks belong to; without one (Liked Songs) the loaded tracks become the queue.
  contextUri?: string;
  // An album's own tracks: no covers, album or date added columns.
  album?: boolean;
  // Liked Songs: every track starts out saved.
  liked?: boolean;
  compact?: boolean;
  ref?: Ref<HTMLLIElement>;
};

// `ref` goes to the last track, which loads the next page when it scrolls into view.
export default function TrackList({ tracks, highlight, contextUri, album = false, liked = false, compact = false, ref }: Props) {
  const { nowPlaying, toggle } = usePlayback();
  const setMessage = useContext(MessageContext);
  const { refresh } = useContext(LibraryContext);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const asked = useRef(new Set<string>());
  const header = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  // shortcut: a track listed twice starts from its first copy (offset by URI), since local files are filtered out of
  // playlists and positions would no longer line up; switch to offset.position if those rows are ever shown.
  const start = (uri: string) =>
    contextUri ? { context_uri: contextUri, offset: { uri } } : { uris: tracks.flatMap((track) => (track ? [track.uri] : [])), offset: { uri } };

  // Comment counts for the whole list: one request per 100 tracks rather than one per row. Local files have no id.
  const ids = [...new Set(tracks.flatMap((track) => (track?.id ? [track.id] : [])))];
  useCommentsLoader(() => {
    Promise.all(chunks(ids, 100).map((batch) => api<{ counts: Record<string, number> }>(`/comments/counts?songs=${batch.join(',')}`)))
      .then((answers) => setCounts(Object.assign({}, ...answers.map((answer) => answer.counts))))
      .catch((error) => console.log(error));
  }, [ids.join(',')]);

  // Which songs are in Liked Songs: asked once per song as pages load, 40 to a request (Spotify's limit), not per row.
  useEffect(() => {
    if (liked) return;
    const uris = [...new Set(tracks.flatMap((track) => (track?.id && !asked.current.has(track.uri) ? [track.uri] : [])))];
    for (const batch of chunks(uris, 40)) {
      batch.forEach((uri) => asked.current.add(uri));
      spotify<boolean[]>(`/me/library/contains?uris=${encodeURIComponent(batch.join(','))}`)
        .then((answers) => setSaved((known) => ({ ...known, ...Object.fromEntries(batch.map((uri, i) => [uri, answers[i] === true])) })))
        .catch((error) => console.log(error));
    }
  }, [tracks, liked]);

  const toggleSaved = (uri: string) => {
    const was = saved[uri] ?? liked;
    spotify(`/me/library?uris=${encodeURIComponent(uri)}`, { method: was ? 'DELETE' : 'PUT' })
      .then(() => {
        setSaved((known) => ({ ...known, [uri]: !was }));
        setMessage(was ? 'Removed from Liked Songs' : 'Added to Liked Songs');
        // Spotify takes a moment to count it.
        setTimeout(() => refresh('liked'), 1000);
      })
      .catch((error) => setMessage(`ERROR: ${error.message}`));
  };

  // The header sticks 1px above the top of the scrolling page, so it's "stuck" once it no longer fits whole; only then
  // does it get the page's background, which would otherwise hide the banner's colour behind it.
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!!entry && entry.intersectionRatio < 1 && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0)),
      { root: element.closest('.featured'), threshold: 1 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [tracks.length > 0]);

  if (tracks.length === 0) return null;

  return (
    <div className={`trackList ${album ? 'albumTracks' : ''} ${liked ? 'liked' : ''} ${compact ? 'compact' : ''}`}>
      <div ref={header} className={`trackListHeader ${stuck ? 'stuck' : ''}`}>
        <span className='trackIndex'>#</span>
        <span>Title</span>
        {compact && <span>Artist</span>}
        {!album && <span className='trackAlbumCell'>Album</span>}
        {!album && <span className='trackAddedCell'>Date added</span>}
        <span className='trackLast'>
          <span className='trackDurationIcon' role='img' aria-label='Duration' title='Duration'><Icon name='Clock' width='16' height='16' /></span>
        </span>
      </div>
      <ol className="trackRows">
        {tracks.map((track, index) => track && (
          <TrackListItem
            key={`${track.id}-${index}`}
            track={track}
            index={index}
            album={album}
            highlight={track.id === highlight}
            current={track.uri === nowPlaying.trackUri}
            playing={track.uri === nowPlaying.trackUri && nowPlaying.playing}
            commentCount={counts[track.id] ?? 0}
            saved={saved[track.uri] ?? liked}
            onSave={() => toggleSaved(track.uri)}
            onPlay={() => toggle(track.uri, start(track.uri))}
            ref={index + 1 === tracks.length ? ref : undefined}
          />
        ))}
      </ol>
    </div>
  );
}
