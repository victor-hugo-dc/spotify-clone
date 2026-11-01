import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router'

import PageTitle from '../featured-components/PageTitle'
import CommentSongInfo from '../featured-components/CommentSongInfo'
import { Avatar } from '../featured-components/Comment'
import Icon from '../icons'
import { api } from '../../utilities/api'
import { LibraryContext } from '../../utilities/context'
import usePlayback from '../../utilities/hooks/usePlayback'
import { isNew, loadReleases, markSeen, whatsNew, type Filter, type Notifications, type Release } from '../../utilities/notifications'
import { addedAgo } from '../../utilities/time'
import type { Notification } from '../../utilities/types'
import '../../styles/pages.css'

const filters: Filter[] = ['All', 'Music', 'Comments']

// Spotify's What's New, behind the top bar's bell, with Shoutify's news mixed in by time: the last 30 days' releases of
// the artists you follow, replies to your comments, likes on them, and comments by the people you follow. What came
// since you last looked has a blue dot; opening the page marks everything seen, but the dots stay until you leave.
export default function WhatsNewPage() {
    const artists = useContext(LibraryContext).artists.map((artist) => artist.id).join()
    const [filter, setFilter] = useState<Filter>('All')
    const [answer, setAnswer] = useState<Notifications | null>(null)
    const [failed, setFailed] = useState(false)
    const [releases, setReleases] = useState<Release[] | null>(null)

    // The dots go by when you last looked, from before this visit.
    useEffect(() => {
        api<Notifications>('/notifications')
            .then((answer) => {
                setAnswer(answer)
                markSeen().catch((error) => console.log(error))
            }, () => setFailed(true))
    }, [])

    useEffect(() => {
        let live = true
        loadReleases(artists ? artists.split(',') : []).then((releases) => { if (live) setReleases(releases) })
        return () => { live = false }
    }, [artists])

    // Shown once both are in, so rows don't move as the second lands.
    const ready = releases !== null && (answer !== null || failed)
    const items = ready ? whatsNew(answer?.notifications ?? [], releases, filter) : []

    return (
        <div className='page-content whats-new'>
            <PageTitle name="What's New"/>
            <p className='page-subtitle'>The latest releases from artists you follow, and what your friends say on Shoutify.</p>
            <div className='whats-new-chips' role='group' aria-label='Filters'>
                {filters.map((name) =>
                    <button key={name} className='whats-new-chip no-outline' aria-pressed={filter === name} onClick={() => setFilter(name)}>{name}</button>
                )}
            </div>
            {failed && <p className='empty-state' role='alert'>Couldn't load your notifications. Try again in a moment.</p>}
            {ready && !failed && items.length === 0 &&
                <div className='whats-new-empty'>
                    <h2>You're all caught up</h2>
                    <p>New releases from artists you follow, and replies, likes and comments from your friends, show up here.</p>
                </div>}
            <ul className='whats-new-list'>
                {items.map((item) => {
                    const fresh = answer !== null && isNew(item, answer.seenAt)
                    return item.kind === 'release' ?
                        <li key={item.album.id}><ReleaseItem release={item} fresh={fresh}/></li> :
                        <li key={`${item.kind}-${item.commentID}-${item.userID}`}><NotificationItem notification={item} fresh={fresh}/></li>
                })}
            </ul>
        </div>
    )
}

// How long ago, after Spotify's blue dot when it's new since you last looked.
function When({at, fresh}: {at: number, fresh: boolean}) {
    const iso = new Date(at).toISOString()
    return (
        <p className='whats-new-when'>
            {fresh && <span className='whats-new-dot' role='img' aria-label='New'></span>}
            <time dateTime={iso}>{addedAgo(iso)}</time>
        </p>
    )
}

// A release as Spotify's What's New shows it: the cover, when, the title (to its page; the whole row leads there), what
// it is and who made it, and a play button that starts it.
function ReleaseItem({release: {at, album}, fresh}: {release: Release, fresh: boolean}) {
    const {isPlaying, toggle} = usePlayback()
    const playing = isPlaying(album.uri)
    const image = album.images[0]?.url

    return (
        <article className='whats-new-item whats-new-release'>
            <div className='whats-new-cover'>{image && <img src={image} alt=''/>}</div>
            <div className='whats-new-main'>
                <When at={at} fresh={fresh}/>
                <Link to={`/album/${album.id}`} className='whats-new-title'>{album.name}</Link>
                <p className='whats-new-subtitle'>{album.album_type === 'single' ? 'Single' : 'Album'} • {album.artists.map((artist) => artist.name).join(', ')}</p>
            </div>
            <button className='whats-new-play no-outline' title={playing ? 'Pause' : 'Play'} aria-label={`${playing ? 'Pause' : 'Play'} ${album.name}`}
                    onClick={() => toggle(album.uri, {context_uri: album.uri})}>
                <Icon name={playing ? 'Pause' : 'Play'} width='16' height='16'/>
            </button>
        </article>
    )
}

// Shoutify's news: who, what they did, the comment (theirs, or yours they liked) and its song, which leads to the song's
// comments; a reply's lands on the reply, lit up, with a composer to answer it.
function NotificationItem({notification, fresh}: {notification: Notification, fresh: boolean}) {
    const {kind, at, userName, userImage, commentID, commentBody, songName} = notification

    return (
        <article className='whats-new-item'>
            <Avatar name={userName} image={userImage}/>
            <div className='whats-new-main'>
                <When at={at} fresh={fresh}/>
                <p className='whats-new-headline'>
                    <b>{userName}</b> {kind === 'reply' ? 'replied to your comment' : kind === 'like' ? 'liked your comment' : <>commented on <b>{songName ?? 'a song'}</b></>}
                </p>
                <p className='whats-new-comment'>{commentBody}</p>
                <CommentSongInfo {...notification} state={kind === 'reply' ? {reply: commentID} : undefined}/>
            </div>
        </article>
    )
}
