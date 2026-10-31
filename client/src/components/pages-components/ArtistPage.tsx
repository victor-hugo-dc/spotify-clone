import React from 'react'
import {useState, useEffect, useContext} from 'react'
import {useParams} from 'react-router'

import { spotify } from '../../utilities/spotify'
import useLibrary from '../../utilities/hooks/useLibrary'
import {MessageContext} from '../../utilities/context'
import type { Album, Artist, Paging } from '../../utilities/types'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import { shareItems } from '../featured-components/MoreMenu'
import AboutMenu from '../featured-components/AboutMenu'
import Loading from '../featured-components/Loading'
import LoadError from '../featured-components/LoadError'
import '../../styles/lists.css'

const emptyBanner: BannerInfo = {name: '', user: []}

export default function ArtistPage() {
    const { id = '' } = useParams()
    const setMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [album, setAlbum] = useState<Album[]>([])
    const [single, setSingle] = useState<Album[]>([])
    const [appear, setAppear] = useState<Album[]>([])
    const [compilation, setCompilation] = useState<Album[]>([])
    const [follow, followArtist] = useLibrary(`spotify:artist:${id}`)
    const [uri, setUri] = useState('')

    useEffect(() => {
        setAlbum([])
        setSingle([])
        setAppear([])
        setCompilation([])
        setUri('')
        setLoading(true)
        setError('')

        const controller = new AbortController()
        const { signal } = controller

        // Up to 50 per section (Spotify's default is 20), in the listener's market so regional editions don't repeat.
        const albums = (group: string) => spotify<Paging<Album>>(`/artists/${id}/albums?include_groups=${group}&limit=50&market=from_token`, {signal})
        Promise.all([spotify<Artist>(`/artists/${id}`, {signal}), albums('album'), albums('single'), albums('appears_on'), albums('compilation')])
            .then(([artistData, albumData, singleData, appearData, compilationData]) => {
                const {name, images, uri} = artistData
                setbannerInfo({...emptyBanner, name, images})
                setUri(uri)
                setAlbum(albumData.items)
                setSingle(singleData.items)
                setAppear(appearData.items)
                setCompilation(compilationData.items)
                setLoading(false)
            })
            .catch((error) => {
                setError(error.message)
                setLoading(false)
            })

        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

    return (
        loading ? 
            <Loading /> 
            : 
            error ?
            <LoadError what='artist' error={error}/>
            : 
            <div className='listPage lists'>
                <PageBanner pageTitle='artist' bannerInfo={bannerInfo}/>
                <div className="playListContent">
                    <PlayListFunctions type='artist' follow={follow} onFollow={followArtist} uri={uri} label={bannerInfo.name} menu={[
                        {label: follow ? 'Unfollow' : 'Follow', onSelect: followArtist},
                        ...shareItems(uri, 'artist', setMessage),
                    ]}/>
                    <div className="page-content">
                        <AboutMenu album={album} single={single} appear={appear} compilation={compilation}/>
                    </div>
                </div>
            </div>
    )
}
