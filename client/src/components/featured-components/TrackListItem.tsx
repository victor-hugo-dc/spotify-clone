import React, { useState, useContext, useEffect, type Ref } from 'react';
import { Link, useNavigate } from "react-router";
import Icon from '../icons';
import formatTime from '../../utilities/time';
import { PlayContext, TokenContext } from '../../utilities/context';
import { api } from '../../utilities/api';
import ControlButton from '../footer-components/ControlButton';
import type { SongComment, Track } from '../../utilities/types';

type Props = { track: Track; highlight: boolean; playContextTrack: (uri: string) => void; ref?: Ref<HTMLLIElement> };

export default function TrackListItem({ track, highlight, playContextTrack, ref }: Props) {
  const { album, artists, name, explicit, duration_ms, uri, id } = track;
  const updatePlayer = useContext(PlayContext);
  const token = useContext(TokenContext);
  const [commentCount, setCommentCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    api<{ comments: SongComment[] }>(`/comments/song/${id}`, token)
      .then((data) => setCommentCount(data.comments.length))
      .catch((error) => console.log(error));
  }, [id, token])

  return (
    <li ref={ref} className={`trackListItem ${highlight ? 'highlight' : ''}`}>
      <div className='trackItemPlay'>
        <button className='hoverIcon trackTopAlign no-outline' onClick={() => { playContextTrack(uri); updatePlayer(); }}>
          <Icon name='Play' height='20' width='20' />
        </button>
        <div className='itemIcon trackTopAlign'>
          <Icon name='Music' />
        </div>
      </div>

      <div className='trackItemInfo'>
        <div className='trackTopAlign'>
          <div className='trackName ellipsis-one-line'>{name}</div>
          <div className='trackInfo'>
            {explicit && <span className='explicit-label'>E</span>}
            <span className='trackArtists ellipsis-one-line'>
              {artists.map((artist) => (
                <Link to={`/artist/${artist.id}`} key={artist.id}>
                  {artist.name}
                </Link>
              ))}
            </span>
            {album && (
              <>
                <span className='trackInfoSep'>•</span>
                <span className='trackAlbum ellipsis-one-line'>
                  <Link to={`/album/${album.id}`}>{album.name}</Link>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className='trackItemCommentCount'>
        {commentCount}
      </div>
      
      <div className='trackItemCommentButton'>
        <ControlButton
          title="Comment"
          icon="Comment" 
          size="x-larger"
          onClick={() => navigate(`/comments/${id}`)}
				/>
      </div>
      

      <div className='trackItemDuration'>
        <div className='duration trackTopAlign'>
          <span>{formatTime(duration_ms)}</span>
        </div>
      </div>
    </li>
  );
}
