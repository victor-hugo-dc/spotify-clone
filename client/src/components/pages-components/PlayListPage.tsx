import React, {useEffect, useState, useContext} from 'react'
import {useNavigate, useParams} from 'react-router'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import { shareItems, type MenuItem } from '../featured-components/MoreMenu'
import EditDetails from '../featured-components/EditDetails'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'
import LoadError from '../featured-components/LoadError'

import {MessageContext, UserContext} from '../../utilities/context'
import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import useLibrary from '../../utilities/hooks/useLibrary'
import { spotify } from '../../utilities/spotify'
import { plainText } from '../../utilities/html'
import type { Paging, Playlist, Track } from '../../utilities/types'

type PlaylistEntry = {item: Track | {type: 'episode'} | null}
// Playlists can hold podcast episodes and local files too; only Spotify tracks are listed (local files have no id).
const toTrack = (entry: PlaylistEntry) => entry.item?.type === 'track' && entry.item.id ? entry.item : null
const emptyBanner: BannerInfo = {name: '', user: [], primary_color: '#262626'}

export default function PlayListPage({refreshPlaylist}: {refreshPlaylist: () => void}) {
    const { id = '' } = useParams()
    const setMessage = useContext(MessageContext)
    const user = useContext(UserContext)
    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)
    const [tracks, setTracks] = useState<Track[]>([])
    const [like, followPlaylist] = useLibrary(`spotify:playlist:${id}`, 'Your Library', () => setTimeout(() => refreshPlaylist(), 1000))
    const [setNext, lastRef] = useInfiniteScroll(setTracks, toTrack)
    const [uri, setUri] = useState('')
    const [listed, setListed] = useState(true)
    const [ownerId, setOwnerId] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const [editing, setEditing] = useState(false)

    useEffect(() => {
        setUri('')
        setbannerInfo(emptyBanner)
        setTracks([])
        setNext(null)
        setLoading(true)
        setError('')

        const controller = new AbortController()
        // `items` only comes back for playlists the user owns or collaborates on.
        spotify<Playlist & {items?: Paging<PlaylistEntry>}>(`/playlists/${id}`, {signal: controller.signal})
            .then(({name, description, owner, followers, primary_color, items, images, uri, public: shared}) => {
                setOwnerId(owner.id)
                setIsPublic(shared === true)
                setbannerInfo({name, description: plainText(description), user: [owner], followers, primary_color: primary_color ?? emptyBanner.primary_color, images})
                setTracks(items?.items.map(toTrack).filter((track) => track !== null) ?? [])
                setNext(items?.next ?? null)
                setListed(items !== undefined)
                setUri(uri)
                setLoading(false)
            })
            .catch((error) => {
                setLoading(false)
                setError(error.message)
            })


        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

    // PUT /playlists/{id} changes the name, description or visibility; only the owner may.
    const changeDetails = (details: {name?: string, description?: string, public?: boolean}, done: string) => {
        spotify(`/playlists/${id}`, {method: 'PUT', body: details})
            .then(() => {
                const {public: shared, ...text} = details
                setbannerInfo((banner) => ({...banner, ...text}))
                if (shared !== undefined) setIsPublic(shared)
                setMessage(done)
                refreshPlaylist()
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    // Deleting your own playlist means removing it from your library, as Spotify's apps do.
    const deletePlaylist = () => {
        if (!window.confirm(`Delete "${bannerInfo.name}" from Your Library?`)) return
        spotify(`/me/library?uris=${encodeURIComponent(uri)}`, {method: 'DELETE'})
            .then(() => {
                setMessage('Removed from Your Library')
                refreshPlaylist()
                navigate('/')
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    // Both false until /me answers, which after an error it never does: on your own playlist the heart deletes it unasked.
    const owned = user !== null && ownerId === user.id
    const theirs = user !== null && ownerId !== user.id
    const menu: MenuItem[] = [
        ...(owned ? [
            {label: 'Edit details', onSelect: () => setEditing(true)},
            {label: isPublic ? 'Make private' : 'Make public', onSelect: () => changeDetails({public: !isPublic}, isPublic ? 'Playlist is now private' : 'Playlist is now public')},
            {label: 'Delete', onSelect: deletePlaylist},
        ] : theirs ? [
            {label: like ? 'Remove from Your Library' : 'Add to Your Library', onSelect: followPlaylist},
        ] : []),
        ...shareItems(uri, 'playlist', setMessage),
    ]

    return (
        loading? 
        <Loading />
        : 
        error ?
        <LoadError what='playlist' error={error}/>
        :
        <div className='listPage'>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                {/* No heart on your own playlist: un-saving it deletes it, so that's the menu's Delete, which asks first. */}
                <PlayListFunctions onFollow={theirs ? followPlaylist : undefined} follow={like} uri={uri} menu={menu} label={bannerInfo.name}/>
                <div className="page-content">
                    {listed ?
                        <TrackList ref={lastRef} tracks={tracks} contextUri={uri}/> :
                        <p style={{color: '#fff', padding: '16px 0'}}>Spotify only shows apps the tracks of playlists you own or collaborate on. Press play to listen to this one.</p>
                    }
                </div>
            </div>
            {editing &&
                <EditDetails
                    details={{name: bannerInfo.name, description: bannerInfo.description ?? ''}}
                    onSave={(details) => { setEditing(false); changeDetails(details, 'Details saved') }}
                    onClose={() => setEditing(false)}
                />
            }
        </div>
    )
}
