import React, {useEffect, useState, useContext} from 'react'
import {useParams, useSearchParams} from 'react-router'


import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import {TokenContext, MessageContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Album, Paging, Track } from '../../utilities/types'

const emptyBanner: BannerInfo = {name: '', user: [], primary_color: '#262626'}

export default function AlbumPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const highlight = searchParams.get('highlight')
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
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

    return (
        loading? 
        <Loading />
        :
        <div className='listPage' style={{display: `${tracks.length===0? 'none':'block'}`}}>
            <PageBanner pageTitle={albumType} bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions onFollow={() => setMessage('Oops looks like the Spotify API does not support following albums')} uri={uri}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} highlight={highlight} contextUri={uri}/>
                </div>
            </div>
        </div>
    )
}
