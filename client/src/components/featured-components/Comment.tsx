import React from 'react';
import CommentSongInfo from './CommentSongInfo';
import formatTime from '../../utilities/time';
import type { SongComment } from '../../utilities/types';

export default function Comment({comment, showSong}: {comment: SongComment, showSong: boolean}) {
    const {authorName, authorImage, timestamp, commentBody} = comment;

    return (
          <div className="spotify-tweet-box">
            <div className="avatar">
              {authorImage ?
                <img src={authorImage} className="timestamp" alt=''></img> :
                // No Spotify profile picture: show their initial, as Spotify does.
                <span className="timestamp avatar-initial" aria-hidden='true'>{authorName.slice(0, 1).toUpperCase()}</span>
              }
            </div>
            <div className="content">
              <div className="header">
                <span className="username">{authorName}</span>
                <span className="time">@{formatTime(timestamp)}</span>
              </div>
              <div className="message">
                {commentBody}
              </div>
              {showSong && <CommentSongInfo comment={comment}/>}
            </div>
          </div>

    )
}
