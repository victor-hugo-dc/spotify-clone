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

const emptyBanner: BannerInfo = {name: '', user: [], primary_color: 'rgb(83, 83, 83)'}

export default function ArtistPage() {
    const { id = '' } = useParams()
    const setMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)

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

        const controller = new AbortController()
        const { signal } = controller

        const albums = (group: string) => spotify<Paging<Album>>(`/artists/${id}/albums?include_groups=${group}`, {signal})
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
                console.log(error)
                setLoading(false)
            })

        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

    return (
        loading ? 
            <Loading /> 
            : 
            <div className='listPage'>
                <PageBanner pageTitle='artist' bannerInfo={bannerInfo}/>
                <div className="playListContent">
                    <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
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
