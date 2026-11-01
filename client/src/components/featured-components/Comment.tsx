import React from 'react';
import CommentSongInfo from './CommentSongInfo';
import formatTime, { postedAgo } from '../../utilities/time';
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

// A row of a Twitter-like timeline: who wrote it, the moment in the song it's about (green) and how long ago they posted
// it (comments from before Shoutify kept that don't say), then what they wrote and, in the feed, the song.
export default function Comment({comment, showSong}: {comment: SongComment, showSong: boolean}) {
    const {authorName, authorImage, timestamp, commentBody, createdAt} = comment;

    return (
          <article className="comment-row">
            <Avatar name={authorName} image={authorImage}/>
            <div className="comment-main">
              <div className="comment-header">
                <span className="comment-author">{authorName}</span>
                <span className="comment-at">{formatTime(timestamp)}</span>
                {createdAt !== null && <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={new Date(createdAt).toISOString()} title={new Date(createdAt).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}>
                    {postedAgo(createdAt)}
                  </time>
                </>}
              </div>
              <p className="comment-body">{commentBody}</p>
              {showSong && <CommentSongInfo {...comment}/>}
            </div>
          </article>
    )
}
