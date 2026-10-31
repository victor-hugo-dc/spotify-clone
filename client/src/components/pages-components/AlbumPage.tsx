import React, {useEffect, useState, useContext} from 'react'
import {useNavigate, useParams, useSearchParams} from 'react-router'


import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import { shareItems } from '../featured-components/MoreMenu'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'
import LoadError from '../featured-components/LoadError'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import useLibrary from '../../utilities/hooks/useLibrary'
import useListView from '../../utilities/hooks/useListView'
import {MessageContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import { songStats } from '../../utilities/lists'
import type { Album, Paging, Track } from '../../utilities/types'
import '../../styles/lists.css'

const emptyBanner: BannerInfo = {name: '', user: []}

export default function AlbumPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const highlight = searchParams.get('highlight')
    const setMessage = useContext(MessageContext)
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [albumType, setAlbumType] = useState('')
    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [tracks, setTracks] = useState<Track[]>([])
    const [total, setTotal] = useState<number>()
    const [view, setView] = useListView()
    const [uri, setUri] = useState('')
    const [setNext, lastRef] = useInfiniteScroll(setTracks)
    const [saved, toggleSaved] = useLibrary(`spotify:album:${id}`)

    useEffect(() => {
        setTracks([])
        setTotal(undefined)
        setNext(null)
        setbannerInfo(emptyBanner)
        setUri('')
        setLoading(true)
        setError('')
        const controller = new AbortController()
        spotify<Album & {tracks: Paging<Track>, total_tracks?: number}>(`/albums/${id}`, {signal: controller.signal})
            .then(({album_type, name, artists, tracks, images, release_date, uri, total_tracks}) => {
                setAlbumType(album_type)
                setbannerInfo({...emptyBanner, name, user: artists, images, release_date})
                setTracks(tracks.items)
                setTotal(total_tracks ?? tracks.total ?? (tracks.next ? undefined : tracks.items.length))
                setNext(tracks.next)
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

    return (
        loading? 
        <Loading />
        :
        error ?
        <LoadError what='album' error={error}/>
        :
        <div className='listPage lists'>
            <PageBanner pageTitle={albumType} bannerInfo={{...bannerInfo, stats: songStats(total, tracks)}}/>
            <div className="playListContent">
                <PlayListFunctions follow={saved} onFollow={toggleSaved} uri={uri} label={bannerInfo.name} view={view} onView={setView} menu={[
                    {label: saved ? 'Remove from Your Library' : 'Save to Your Library', onSelect: toggleSaved},
                    ...bannerInfo.user.slice(0, 1).map((artist) => ({label: 'Go to artist', onSelect: () => navigate(`/artist/${artist.id}`)})),
                    ...shareItems(uri, 'album', setMessage),
                ]}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} highlight={highlight} contextUri={uri} album compact={view === 'compact'}/>
                </div>
            </div>
        </div>
    )
}
