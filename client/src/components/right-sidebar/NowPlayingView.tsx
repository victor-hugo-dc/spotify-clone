import React, { useContext, useEffect, useState } from 'react'
import { Link } from 'react-router'

import Icon from '../icons'
import { Avatar } from './FriendActivity'
import { QueueRow } from './QueueView'
import useQueue, { useSkipTo } from './useQueue'
import { api } from '../../utilities/api'
import { spotify } from '../../utilities/spotify'
import formatTime from '../../utilities/time'
import useCoverColor from '../../utilities/hooks/useCoverColor'
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader'
import useLiked from '../../utilities/hooks/useLiked'
import useWriteComment from '../../utilities/hooks/useWriteComment'
import { LayoutContext, type PlayingTrack } from '../../utilities/context'
import type { Artist, SongComment } from '../../utilities/types'

// The right panel's Now playing view: the song's cover, title and artists, then cards: Shoutify's comments on it (where
// Spotify previews the lyrics), its first artist, and what plays next.
export default function NowPlayingView({ track }: { track: PlayingTrack }) {
    const { setRightPanel } = useContext(LayoutContext)
    const cover = track.album.images[0]?.url
    const color = useCoverColor(cover)
    // Comments are on songs on Spotify; local files can't be saved either.
    const songId = track.uri.startsWith('spotify:track:') ? track.id : null
    const savable = !track.uri.startsWith('spotify:local:')
    const [liked, toggleLiked] = useLiked(savable ? track.uri : '')
    const artistId = track.artists[0]?.id ?? null
    const [artist, setArtist] = useState<Artist | null>(null)
    const next = useQueue(track.uri)?.queue[0]
    const skipTo = useSkipTo()
    const writeComment = useWriteComment()

    // Tagged with the song they're on, so a slow answer about the last song can't show on this one.
    const [loaded, setLoaded] = useState<{ id: string; comments: SongComment[] | null }>()
    useCommentsLoader(() => {
        if (!songId) return
        api<{ comments: SongComment[] }>(`/comments/song/${songId}`)
            .then((data) => setLoaded({ id: songId, comments: data.comments }), () => setLoaded({ id: songId, comments: null }))
    }, [songId])
    const comments = loaded?.id === songId ? loaded.comments : undefined

    useEffect(() => {
        setArtist(null)
        if (!artistId) return
        const controller = new AbortController()
        spotify<Artist>(`/artists/${artistId}`, { signal: controller.signal }).then(setArtist, (error) => console.log(error))
        return () => controller.abort()
    }, [artistId])

    const albumPage = track.album.id ? `/album/${track.album.id}?highlight=${track.id}` : null
    const picture = artist?.images?.[0]?.url

    return (
        <div className='npv'>
            {cover ? <img className='npv-cover' src={cover} alt='' /> : <div className='npv-cover'><Icon name='Music2' /></div>}

            <div className='npv-track'>
                <div className='npv-names'>
                    <div className='npv-title ellipsis-one-line'>{albumPage ? <Link to={albumPage}>{track.name}</Link> : track.name}</div>
                    <div className='npv-artists ellipsis-one-line'>
                        {track.artists.map((artist, index) => artist.id ?
                            <Link key={index} to={`/artist/${artist.id}`}>{artist.name}</Link> :
                            <span key={index}>{artist.name}</span>)}
                    </div>
                </div>
                {savable &&
                    // Named apart from the player bar's button, which saves the same song.
                    <button className={`npv-save no-outline${liked ? ' saved' : ''}`} aria-label='Add to Liked Songs' title={liked ? 'Remove from Liked Songs' : 'Add to Liked Songs'} aria-pressed={liked} onClick={toggleLiked}>
                        <Icon name={liked ? 'Saved' : 'AddCircle'} width='16' height='16' />
                    </button>
                }
            </div>

            {songId && comments !== undefined &&
                <div className='npv-card npv-comments' style={color ? { backgroundColor: color } : undefined}>
                    <div className='npv-card-header'>
                        <h2>Comments</h2>
                        {!!comments?.length && <Link className='npv-card-link' to={`/comments/${songId}`}>Show all</Link>}
                    </div>
                    {comments === null ? <p className='npv-comments-note' role='alert'>Couldn't load the comments.</p> :
                        comments.length === 0 ? <div className='npv-comments-empty'>
                            <p className='npv-comment-body'>No one's commented thus far. Be the first!</p>
                            <button className='npv-pill no-outline' onClick={() => writeComment(songId)}>Add a comment</button>
                        </div> :
                        <ul className='npv-comment-list'>
                            {/* The newest three, replies left out. */}
                            {comments.filter((comment) => comment.parentID === null).slice(-3).reverse().map((comment) => (
                                <li key={comment.id}>
                                    <div className='npv-comment-who'>
                                        <Avatar name={comment.authorName} image={comment.authorImage} />
                                        <span className='npv-comment-author ellipsis-one-line'>{comment.authorName}</span>
                                        <span className='npv-comment-at'>at {formatTime(comment.timestamp)}</span>
                                    </div>
                                    <p className='npv-comment-body'>{comment.commentBody}</p>
                                </li>
                            ))}
                        </ul>}
                </div>
            }

            {artist &&
                <div className='npv-card npv-artist'>
                    {picture ?
                        <div className='npv-artist-image'><img src={picture} alt='' /><h2>About the artist</h2></div> :
                        <div className='npv-card-header'><h2>About the artist</h2></div>}
                    <Link className='npv-artist-name' to={`/artist/${artist.id}`}>{artist.name}</Link>
                </div>
            }

            {next &&
                <div className='npv-card npv-next'>
                    <div className='npv-card-header'>
                        <h2>Next in queue</h2>
                        <button className='npv-card-link no-outline' onClick={() => setRightPanel('queue')}>Open queue</button>
                    </div>
                    <QueueRow item={next} onPlay={() => skipTo(1)} />
                </div>
            }
        </div>
    )
}
