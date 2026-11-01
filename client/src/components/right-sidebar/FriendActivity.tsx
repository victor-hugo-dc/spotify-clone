import React, { useEffect, useState } from 'react'
import { Link } from 'react-router'

import Icon from '../icons'
import { api } from '../../utilities/api'
import { lastPlayed, playingNow, type Friend } from '../../utilities/activity'
import { postedAgo } from '../../utilities/time'

// Someone's Spotify picture, or their initial when they have none.
export function Avatar({ name, image }: { name: string, image: string | null }) {
    return image
        ? <img className='comment-avatar' src={image} alt='' />
        : <span className='comment-avatar avatar-initial' aria-hidden='true'>{name.slice(0, 1).toUpperCase()}</span>
}

// The right panel's Friend Activity, like Spotify's: the people you follow on Spotify who use Shoutify, and what they
// play, or last played and how long ago. Loaded again every minute while it's open.
export default function FriendActivity() {
    const [friends, setFriends] = useState<Friend[] | null>()

    useEffect(() => {
        const load = () => api<{ friends: Friend[] }>('/friends').then((data) => setFriends(data.friends), () => setFriends(null))
        load()
        const timer = setInterval(load, 60 * 1000)
        return () => clearInterval(timer)
    }, [])

    if (friends === undefined) return null
    if (friends === null) return <p className='right-sidebar-note' role='alert'>Couldn't load your friends. Try again in a moment.</p>
    if (!friends.length) return <p className='right-sidebar-note'>Follow friends on Spotify who use Shoutify and they'll show up here.</p>
    const now = Date.now()
    return (
        <ul className='friend-activity'>
            {friends.map(({ id, name, image, activity }) => (
                <li key={id} className='friend'>
                    <Avatar name={name} image={image} />
                    <div className='friend-text'>
                        <div className='friend-who'>
                            <span className='friend-name ellipsis-one-line'>{name}</span>
                            {activity && (playingNow(activity, now) ?
                                <span className='equalizer' role='img' aria-label='Playing now'><span></span><span></span><span></span></span> :
                                <time className='friend-at' dateTime={new Date(lastPlayed(activity)).toISOString()}
                                      title={new Date(lastPlayed(activity)).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}>
                                    {postedAgo(lastPlayed(activity), now)}
                                </time>)}
                        </div>
                        {activity ? <>
                            <Link to={`/comments/${activity.songID}`} className='friend-song ellipsis-one-line'>
                                {activity.songName} • {activity.songArtist}
                            </Link>
                            {activity.albumName && activity.albumID &&
                                <Link to={`/album/${activity.albumID}`} className='friend-album ellipsis-one-line'>
                                    <Icon name='CD' />{activity.albumName}
                                </Link>}
                        </> : <p className='friend-none'>Hasn't played anything on Shoutify yet.</p>}
                    </div>
                </li>
            ))}
        </ul>
    )
}
