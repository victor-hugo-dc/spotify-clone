import React, { useContext, type Ref } from 'react';
import { Link, useNavigate } from "react-router";
import Icon from '../icons';
import MoreMenu, { shareItems } from './MoreMenu';
import formatTime, { addedAgo } from '../../utilities/time';
import { MessageContext } from '../../utilities/context';
import type { Listed } from './TrackList';

type Props = {
  track: Listed;
  index: number;
  // An album's own track: no cover or album link.
  album: boolean;
  highlight: boolean;
  current: boolean;
  playing: boolean;
  commentCount: number;
  saved: boolean;
  onSave: () => void;
  onPlay: () => void;
  ref?: Ref<HTMLLIElement>;
};

// One row of the track table: number (play on hover, bars while playing), cover, title and artists, album, date added,
// then Shoutify's comments, the save button, the length and the "…" menu.
export default function TrackListItem({ track, index, album: albumTrack, highlight, current, playing, commentCount, saved, onSave, onPlay, ref }: Props) {
  const { album, artists, name, explicit, duration_ms, id, uri, added_at } = track;
  const navigate = useNavigate();
  const setMessage = useContext(MessageContext);
  const cover = album?.images.at(-1)?.url;

  return (
    <li ref={ref} className={`trackListItem ${highlight ? 'highlight' : ''} ${current ? 'current' : ''}`}>
      <div className='trackIndex'>
        {playing ? <span className='equalizer' aria-hidden='true'><span></span><span></span><span></span></span> : <span className='trackNumber'>{index + 1}</span>}
        {/* Shown on hover and focus, but always there, so Tab and screen readers reach it. */}
        <button className='trackPlay no-outline' title={playing ? `Pause ${name}` : `Play ${name}`} aria-label={playing ? `Pause ${name}` : `Play ${name}`} onClick={onPlay}>
          <Icon name={playing ? 'Pause' : 'Play'} height='16' width='16' />
        </button>
      </div>

      <div className='trackTitleCell'>
        {!albumTrack && (cover ? <img className='trackCover' src={cover} alt='' loading='lazy' /> : <span className='trackCover' />)}
        <div className='trackText'>
          <div className='trackName ellipsis-one-line'>{name}</div>
          <div className='trackInfo'>
            {explicit && <span className='explicit-label' title='Explicit'>E</span>}
            <span className='trackArtists ellipsis-one-line'>
              {/* Local files have no artist or album ids to link to. */}
              {artists.map((artist, index) => artist.id ? (
                <Link to={`/artist/${artist.id}`} key={index}>
                  {artist.name}
                </Link>
              ) : <span key={index}>{artist.name}</span>)}
            </span>
          </div>
        </div>
      </div>

      {!albumTrack && (
        <div className='trackAlbumCell ellipsis-one-line'>
          {album && (album.id ? <Link to={`/album/${album.id}`}>{album.name}</Link> : album.name)}
        </div>
      )}
      {!albumTrack && <div className='trackAddedCell ellipsis-one-line'>{added_at && addedAgo(added_at)}</div>}

      <div className='trackLast'>
        {id && (
          <button className={`trackComments no-outline ${commentCount > 0 ? 'commented' : ''}`} title={`Comments on ${name} (${commentCount})`} aria-label={`Comments on ${name} (${commentCount})`} onClick={() => navigate(`/comments/${id}`)}>
            {commentCount > 0 && <span aria-hidden='true'>{commentCount}</span>}
            <Icon name='Comment' />
          </button>
        )}
        {id && (
          <button className={`trackSave no-outline ${saved ? 'saved' : ''}`} title={saved ? `Remove ${name} from Liked Songs` : `Save ${name} to Liked Songs`} aria-label={saved ? `Remove ${name} from Liked Songs` : `Save ${name} to Liked Songs`} aria-pressed={saved} onClick={onSave}>
            <Icon name={saved ? 'Saved' : 'AddCircle'} width='16' height='16' />
          </button>
        )}
        <span className='duration'>{formatTime(duration_ms)}</span>
        <MoreMenu label={name} items={[
          ...(album?.id ? [{ label: 'Go to album', onSelect: () => navigate(`/album/${album.id}`) }] : []),
          ...(artists[0]?.id ? [{ label: 'Go to artist', onSelect: () => navigate(`/artist/${artists[0]!.id}`) }] : []),
          ...(id ? [{ label: 'Comments', onSelect: () => navigate(`/comments/${id}`) }] : []),
          ...shareItems(uri, 'song', setMessage),
        ]} />
      </div>
    </li>
  );
}
