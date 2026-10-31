import React from 'react';
import CommentSongInfo from './CommentSongInfo';
import formatTime from '../../utilities/time';
import type { SongComment } from '../../utilities/types';

// Who wrote it: their Spotify picture, or their initial, as Spotify shows people without one.
export function Avatar({name, image}: {name: string, image: string | null}) {
    return (
        <div className="avatar">
          {image ?
            <img src={image} className="timestamp" alt=''></img> :
            <span className="timestamp avatar-initial" aria-hidden='true'>{name.slice(0, 1).toUpperCase()}</span>
          }
        </div>
    )
}

export default function Comment({comment, showSong}: {comment: SongComment, showSong: boolean}) {
    const {authorName, authorImage, timestamp, commentBody} = comment;

    return (
          <div className="spotify-tweet-box">
            <Avatar name={authorName} image={authorImage}/>
            <div className="content">
              <div className="header">
                <span className="username">{authorName}</span>
                <span className="time">@{formatTime(timestamp)}</span>
              </div>
              <div className="message">
                {commentBody}
              </div>
              {showSong && <CommentSongInfo {...comment}/>}
            </div>
          </div>

    )
}
