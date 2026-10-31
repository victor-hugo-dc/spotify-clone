import React, { useState, type Ref } from 'react';
import TrackListItem from './TrackListItem';
import usePlayback from '../../utilities/hooks/usePlayback';
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader';
import { api } from '../../utilities/api';
import type { Track } from '../../utilities/types';

type Props = {
  tracks: (Track | null)[];
  highlight?: string | null;
  // The album or playlist the tracks belong to; without one (Liked Songs) the loaded tracks become the queue.
  contextUri?: string;
  ref?: Ref<HTMLLIElement>;
};

// `ref` goes to the last track, which loads the next page when it scrolls into view.
export default function TrackList({ tracks, highlight, contextUri, ref }: Props) {
  const { nowPlaying, toggle } = usePlayback();
  const [counts, setCounts] = useState<Record<string, number>>({});
  // shortcut: a track listed twice starts from its first copy (offset by URI), since local files are filtered out of
  // playlists and positions would no longer line up; switch to offset.position if those rows are ever shown.
  const start = (uri: string) =>
    contextUri ? { context_uri: contextUri, offset: { uri } } : { uris: tracks.flatMap((track) => (track ? [track.uri] : [])), offset: { uri } };

  // Comment counts for the whole list: one request per 100 tracks rather than one per row. Local files have no id.
  const ids = [...new Set(tracks.flatMap((track) => (track?.id ? [track.id] : [])))];
  useCommentsLoader(() => {
    const batches = [];
    for (let i = 0; i < ids.length; i += 100) batches.push(ids.slice(i, i + 100));
    Promise.all(batches.map((batch) => api<{ counts: Record<string, number> }>(`/comments/counts?songs=${batch.join(',')}`)))
      .then((answers) => setCounts(Object.assign({}, ...answers.map((answer) => answer.counts))))
      .catch((error) => console.log(error));
  }, [ids.join(',')]);

  return (
    <div className="trackListContainer">
      <ol className="trackList">
        {tracks.map((track, index) => track && (
          <TrackListItem
            key={`${track.id}-${index}`}
            track={track}
            highlight={track.id === highlight}
            current={track.uri === nowPlaying.trackUri}
            playing={track.uri === nowPlaying.trackUri && nowPlaying.playing}
            commentCount={counts[track.id] ?? 0}
            onPlay={() => toggle(track.uri, start(track.uri))}
            ref={index + 1 === tracks.length ? ref : undefined}
          />
        ))}
      </ol>
    </div>
  );
}
