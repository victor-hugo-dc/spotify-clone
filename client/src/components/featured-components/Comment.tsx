import React, { useContext, useId, useState } from 'react';
import CommentSongInfo from './CommentSongInfo';
import Icon from '../icons';
import { api } from '../../utilities/api';
import { MessageContext } from '../../utilities/context';
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

type Like = {likes: number, liked: boolean};

// A row of a Twitter-like timeline: who wrote it, the moment in the song it's about (green; a reply is about its
// comment's, so it leaves that out) and how long ago they posted it (comments from before Shoutify kept that don't
// say), then what they wrote, in the feed the song, and Reply and Like with their counts. `highlight` lights it up a
// moment.
export default function Comment({comment, showSong, onReply, highlight = false}: {comment: SongComment, showSong: boolean, onReply: () => void, highlight?: boolean}) {
    const {id, authorName, authorImage, timestamp, commentBody, createdAt, parentID, replies} = comment;
    const setMessage = useContext(MessageContext);
    const counts = useId();

    // Your like shows at once, then as the server has it; a failure puts it back. Comments loaded again bring their own.
    const [mine, setMine] = useState<Like & {of: SongComment}>();
    const {likes, liked} = mine?.of === comment ? mine : comment;
    const toggleLike = () => {
        const set = (like: Like) => setMine({...like, of: comment});
        set({likes: likes + (liked ? -1 : 1), liked: !liked});
        api<Like>(`/comments/${id}/like`, {liked: !liked})
            .then(set, (error) => {
                set({likes, liked});
                setMessage(`ERROR: could not like it (${error.message})`);
            });
    };

    return (
          <article id={`comment-${id}`} className={`comment-row${parentID === null ? '' : ' reply'}${highlight ? ' highlight' : ''}`}>
            <Avatar name={authorName} image={authorImage}/>
            <div className="comment-main">
              <div className="comment-header">
                <span className="comment-author">{authorName}</span>
                {parentID === null && <span className="comment-at">{formatTime(timestamp)}</span>}
                {createdAt !== null && <>
                  <span aria-hidden="true">·</span>
                  <time dateTime={new Date(createdAt).toISOString()} title={new Date(createdAt).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}>
                    {postedAgo(createdAt)}
                  </time>
                </>}
              </div>
              <p className="comment-body">{commentBody}</p>
              {showSong && <CommentSongInfo {...comment}/>}
              {/* Each button is named for what it does, and described by its count. */}
              <div className="comment-actions">
                <button className="comment-action comment-reply no-outline" aria-label="Reply" aria-describedby={replies ? `${counts}replies` : undefined} onClick={onReply}>
                  <Icon name="MessageCircle"/>
                  {replies > 0 && <span id={`${counts}replies`}>{replies}</span>}
                </button>
                <button className="comment-action comment-like no-outline" aria-label="Like" aria-pressed={liked} aria-describedby={likes ? `${counts}likes` : undefined} onClick={toggleLike}>
                  <Icon name="Heart" fill={liked}/>
                  {likes > 0 && <span id={`${counts}likes`}>{likes}</span>}
                </button>
              </div>
            </div>
          </article>
    )
}
