import React, {useEffect, useState, useContext} from 'react'
import {useNavigate, useParams, useSearchParams} from 'react-router'


import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import { shareItems } from '../featured-components/MoreMenu'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import useLibrary from '../../utilities/hooks/useLibrary'
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
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

    const [albumType, setAlbumType] = useState('')
    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [tracks, setTracks] = useState<Track[]>([])
    const [uri, setUri] = useState('')
    const [setNext, lastRef] = useInfiniteScroll(setTracks)
    const [saved, toggleSaved] = useLibrary(`spotify:album:${id}`)

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
                <PlayListFunctions follow={saved} onFollow={toggleSaved} uri={uri} label={bannerInfo.name} menu={[
                    {label: saved ? 'Remove from Your Library' : 'Save to Your Library', onSelect: toggleSaved},
                    ...bannerInfo.user.slice(0, 1).map((artist) => ({label: 'Go to artist', onSelect: () => navigate(`/artist/${artist.id}`)})),
                    ...shareItems(uri, 'album', setMessage),
                ]}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} highlight={highlight} contextUri={uri}/>
                </div>
            </div>
        </div>
    )
}
