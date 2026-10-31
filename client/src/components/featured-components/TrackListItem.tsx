import React, { type Ref } from 'react';
import { Link, useNavigate } from "react-router";
import Icon from '../icons';
import formatTime from '../../utilities/time';
import ControlButton from '../footer-components/ControlButton';
import type { Track } from '../../utilities/types';

type Props = { track: Track; highlight: boolean; current: boolean; playing: boolean; commentCount: number; onPlay: () => void; ref?: Ref<HTMLLIElement> };

export default function TrackListItem({ track, highlight, current, playing, commentCount, onPlay, ref }: Props) {
  const { album, artists, name, explicit, duration_ms, id } = track;
  const navigate = useNavigate();

  return (
    <li ref={ref} className={`trackListItem ${highlight ? 'highlight' : ''} ${current ? 'current' : ''}`}>
      <div className='trackItemPlay'>
        <button className='hoverIcon trackTopAlign no-outline' title={playing ? `Pause ${name}` : `Play ${name}`} aria-label={playing ? `Pause ${name}` : `Play ${name}`} onClick={onPlay}>
          <Icon name={playing ? 'Pause' : 'Play'} height='20' width='20' />
        </button>
        <div className='itemIcon trackTopAlign'>
          {playing ? <span className='equalizer' aria-hidden='true'><span></span><span></span><span></span></span> : <Icon name='Music' />}
        </div>
      </div>

      <div className='trackItemInfo'>
        <div className='trackTopAlign'>
          <div className='trackName ellipsis-one-line'>{name}</div>
          <div className='trackInfo'>
            {explicit && <span className='explicit-label'>E</span>}
            <span className='trackArtists ellipsis-one-line'>
              {/* Local files have no artist or album ids to link to. */}
              {artists.map((artist, index) => artist.id ? (
                <Link to={`/artist/${artist.id}`} key={index}>
                  {artist.name}
                </Link>
              ) : <span key={index}>{artist.name}</span>)}
            </span>
            {album && (
              <>
                <span className='trackInfoSep'>•</span>
                <span className='trackAlbum ellipsis-one-line'>
                  {album.id ? <Link to={`/album/${album.id}`}>{album.name}</Link> : album.name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {id && (
        <>
          <div className='trackItemCommentCount' aria-hidden='true'>
            {commentCount}
          </div>

          <div className='trackItemCommentButton'>
            <ControlButton
              title={`Comments on ${name} (${commentCount})`}
              icon="Comment"
              size="x-larger"
              onClick={() => navigate(`/comments/${id}`)}
            />
          </div>
        </>
      )}
      

      <div className='trackItemDuration'>
        <div className='duration trackTopAlign'>
          <span>{formatTime(duration_ms)}</span>
        </div>
      </div>
    </li>
  );
}
