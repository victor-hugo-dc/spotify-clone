import React from 'react';
import CommentSongInfo from './CommentSongInfo';
import formatTime from '../../utilities/time';
import type { SongComment } from '../../utilities/types';

export default function Comment({comment, showSong}: {comment: SongComment, showSong: boolean}) {
    const {authorName, authorImage, timestamp, songID, commentBody} = comment;

    return (
          <div className="spotify-tweet-box">
            <div className="avatar">
              <img src={authorImage ?? undefined} className="timestamp" alt=''></img>
            </div>
            <div className="content">
              <div className="header">
                <span className="username">{authorName}</span>
                <span className="time">@{formatTime(timestamp)}</span>
              </div>
              <div className="message">
                {commentBody}
              </div>
              {showSong ? 
                <CommentSongInfo songID = {songID}/>
                :
                <></>
              }
              
            </div>
          </div>

    )
}
