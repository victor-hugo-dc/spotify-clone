import React, { type Ref } from 'react';
import TrackListItem from './TrackListItem';
import usePlayback from '../../utilities/hooks/usePlayback';
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
  const start = (uri: string) =>
    contextUri ? { context_uri: contextUri, offset: { uri } } : { uris: tracks.flatMap((track) => (track ? [track.uri] : [])), offset: { uri } };

  return (
    <div className="trackListContainer">
      <ol className="trackList">
        {tracks.map((track, index) => track && (
          <TrackListItem
            key={track.id}
            track={track}
            highlight={track.id === highlight}
            current={track.uri === nowPlaying.trackUri}
            playing={track.uri === nowPlaying.trackUri && nowPlaying.playing}
            onPlay={() => toggle(track.uri, start(track.uri))}
            ref={index + 1 === tracks.length ? ref : undefined}
          />
        ))}
      </ol>
    </div>
  );
}
