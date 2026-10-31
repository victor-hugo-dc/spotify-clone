import React, {useEffect, useState, useContext} from 'react'
import {useParams} from 'react-router'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'

import {TokenContext, MessageContext, PlayContext} from '../../utilities/context'
import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import { spotify } from '../../utilities/spotify'
import type { Paging, Playlist, Track } from '../../utilities/types'

type PlaylistEntry = {item: Track | {type: 'episode'} | null}
// Playlists can hold podcast episodes too; only tracks are listed.
const toTrack = (entry: PlaylistEntry) => entry.item?.type === 'track' ? entry.item : null
const emptyBanner: BannerInfo = {name: '', user: [], primary_color: '#262626'}

export default function PlayListPage({playlists, refreshPlaylist}: {playlists: Playlist[], refreshPlaylist: () => void}) {
    const { id = '' } = useParams()
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const updatePlayer = useContext(PlayContext)

    const [loading, setLoading] = useState(true)

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)
    const [tracks, setTracks] = useState<Track[]>([])
    const [like, setLike] = useState(false)
    const [setNext, lastRef] = useInfiniteScroll(setTracks, toTrack)
    const [uri, setUri] = useState('')
    const [listed, setListed] = useState(true)

    useEffect(() => {
        setUri('')
        setbannerInfo(emptyBanner)
        setTracks([])
        setLoading(true)

        const controller = new AbortController()
        // `items` only comes back for playlists the user owns or collaborates on.
        spotify<Playlist & {items?: Paging<PlaylistEntry>}>(`/playlists/${id}`, token, {signal: controller.signal})
            .then(({name, description, owner, followers, primary_color, items, images, uri}) => {
                setbannerInfo({name, description, user: [owner], followers, primary_color: primary_color ?? emptyBanner.primary_color, images})
                setTracks(items?.items.map(toTrack).filter((track) => track !== null) ?? [])
                setNext(items?.next ?? null)
                setListed(items !== undefined)
                setUri(uri)
                setLoading(false)
            })
            .catch((error) => {
                setLoading(false)
                setMessage(`ERROR: ${error.message}`)
            })

        setLike(playlists.some((playlist) => playlist.id === id))

        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

    const followPlaylist = () => {
        spotify(`/me/library?uris=${encodeURIComponent(uri)}`, token, {method: like? 'DELETE':'PUT'})
            .then(() => {
                setMessage(like ? 'Removed from your Library' : 'Added to your Library')
                setLike(!like)
                setTimeout(() => refreshPlaylist(), 1000)
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    const play = (body: object) => {
        spotify('/me/player/play', token, {method: 'PUT', body})
            .then(() => setTimeout(() => updatePlayer(), 500))
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    const playContext = () => play({context_uri: uri})

    const playContextTrack = (trackUri: string) => play({context_uri: uri, offset: {uri: trackUri}})

    return (
        loading? 
        <Loading />
        : 
        <div className='listPage'>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions onFollow={followPlaylist} follow={like} playContext={playContext}/>
                <div className="page-content">
                    {listed ?
                        <TrackList ref={lastRef} tracks={tracks} playContextTrack={playContextTrack}/> :
                        <p style={{color: '#fff', padding: '16px 0'}}>Spotify only shows apps the tracks of playlists you own or collaborate on. Press play to listen to this one.</p>
                    }
                </div>
            </div>
        </div>
    )
}
