import React, { useState } from 'react'
import { Link } from 'react-router'

import { api } from '../../utilities/api'
import formatTime from '../../utilities/time'
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader'
import type { SongComment } from '../../utilities/types'

// A commenter's Spotify picture, or their initial when they have none.
export function Avatar({ comment }: { comment: SongComment }) {
    return comment.authorImage
        ? <img className='comment-avatar' src={comment.authorImage} alt='' />
        : <span className='comment-avatar avatar-initial' aria-hidden='true'>{comment.authorName.slice(0, 1).toUpperCase()}</span>
}

// The right panel's Friend Activity: Shoutify's newest comments, who wrote them and on which song.
// shortcut: comments don't record when they were written, so each shows the moment in the song it's about; add a
// created time on the server to say "3 hr" like Spotify.
export default function FriendActivity() {
    const [comments, setComments] = useState<SongComment[] | null>()

    // Newest first; again whenever someone here adds one.
    useCommentsLoader(() => {
        api<{ comments: SongComment[] }>('/comments/all').then((data) => setComments(data.comments), () => setComments(null))
    }, [])

    if (comments === undefined) return null
    if (comments === null) return <p className='right-sidebar-note' role='alert'>Couldn't load your friends' comments. Try again in a moment.</p>
    if (!comments.length) return <p className='right-sidebar-note'>Your friends' comments show up here. Play a song and hit the comment button to start the conversation.</p>
    return (
        <ul className='friend-activity'>
            {comments.map((comment) => (
                <li key={comment.id} className='friend'>
                    <Avatar comment={comment} />
                    <div className='friend-text'>
                        <div className='friend-who'>
                            <span className='friend-name ellipsis-one-line'>{comment.authorName}</span>
                            <span className='friend-at'>at {formatTime(comment.timestamp)}</span>
                        </div>
                        <p className='friend-comment'>{comment.commentBody}</p>
                        <Link to={`/comments/${comment.songID}`} className='friend-song ellipsis-one-line'>
                            {comment.songName ?? 'Go to the song'}{comment.songArtist ? ` • ${comment.songArtist}` : ''}
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    )
}
