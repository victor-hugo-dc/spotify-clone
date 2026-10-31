import React, { type Ref } from 'react';
import TrackListItem from './TrackListItem';
import type { Track } from '../../utilities/types';

type Props = {
  tracks: (Track | null)[];
  highlight?: string | null;
  playContextTrack: (uri: string) => void;
  ref?: Ref<HTMLLIElement>;
};

// `ref` goes to the last track, which loads the next page when it scrolls into view.
export default function TrackList({ tracks, highlight, playContextTrack, ref }: Props) {
  return (
    <div className="trackListContainer">
      <ol className="trackList">
        {tracks.map((track, index) => track && (
          <TrackListItem
            key={track.id}
            track={track}
            highlight={track.id === highlight}
            playContextTrack={playContextTrack}
            ref={index + 1 === tracks.length ? ref : undefined}
          />
        ))}
      </ol>
    </div>
  );
}
