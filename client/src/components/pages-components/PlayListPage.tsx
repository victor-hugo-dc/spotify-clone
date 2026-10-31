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

type PlaylistItem = {track: Track | null}
const toTrack = (item: PlaylistItem) => item.track
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

    useEffect(() => {
        setUri('')
        setbannerInfo(emptyBanner)
        setTracks([])
        setLoading(true)

        const controller = new AbortController()
        spotify<Playlist & {tracks: Paging<PlaylistItem>}>(`/playlists/${id}`, token, {signal: controller.signal})
            .then(({name, description, owner, followers, primary_color, tracks, images, uri}) => {
                setbannerInfo({name, description, user: [owner], followers, primary_color: primary_color ?? emptyBanner.primary_color, images})
                setTracks(tracks.items.map(toTrack).filter((track) => track !== null))
                setNext(tracks.next)
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
        spotify(`/playlists/${id}/followers`, token, {method: like? 'DELETE':'PUT'})
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
        <div className='listPage' style={{display: `${tracks.length===0? 'none':'block'}`}}>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions onFollow={followPlaylist} follow={like} playContext={playContext}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} playContextTrack={playContextTrack}/>
                </div>
            </div>
        </div>
    )
}
