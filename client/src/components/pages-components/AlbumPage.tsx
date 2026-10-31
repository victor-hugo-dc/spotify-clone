import React, {useEffect, useState, useContext} from 'react'
import {useParams, useSearchParams} from 'react-router'


import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import {TokenContext, MessageContext, PlayContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Album, Paging, Track } from '../../utilities/types'

const emptyBanner: BannerInfo = {name: '', user: [], primary_color: '#262626'}

export default function AlbumPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const highlight = searchParams.get('highlight')
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const updatePlayer = useContext(PlayContext)
    const [loading, setLoading] = useState(true)

    const [albumType, setAlbumType] = useState('')
    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [tracks, setTracks] = useState<Track[]>([])
    const [uri, setUri] = useState('')
    const [setNext, lastRef] = useInfiniteScroll(setTracks)

    useEffect(() => {
        setTracks([])
        setNext(null)
        setbannerInfo(emptyBanner)
        setUri('')
        setLoading(true)
        const controller = new AbortController()
        spotify<Album & {tracks: Paging<Track>}>(`/albums/${id}`, token, {signal: controller.signal})
            .then(({album_type, name, artists, tracks, images, release_date, uri}) => {
                setAlbumType(album_type)
                setbannerInfo({...emptyBanner, name, user: artists, images, release_date})
                setTracks(tracks.items)
                setNext(tracks.next)
                setUri(uri)
                setLoading(false)
            })
            .catch((error) => {
                setLoading(false)
                setMessage(`ERROR: ${error.message}`)
            })
        
        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

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
            <PageBanner pageTitle={albumType} bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions onFollow={() => setMessage('Oops looks like the Spotify API does not support following albums')} playContext={playContext}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} highlight={highlight} playContextTrack={playContextTrack}/>
                </div>
            </div>
        </div>
    )
}
