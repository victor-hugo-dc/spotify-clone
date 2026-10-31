import React from 'react'
import {useState, useEffect, useContext} from 'react'
import {useParams} from 'react-router'

import { spotify } from '../../utilities/spotify'
import {TokenContext, MessageContext, PlayContext} from '../../utilities/context'
import type { Album, Artist, Paging } from '../../utilities/types'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import AboutMenu from '../featured-components/AboutMenu'
import Loading from '../featured-components/Loading'

const emptyBanner: BannerInfo = {name: '', user: [], primary_color: 'rgb(83, 83, 83)'}

export default function ArtistPage() {
    const { id = '' } = useParams()
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)
    const setPlay = useContext(PlayContext)

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [album, setAlbum] = useState<Album[]>([])
    const [single, setSingle] = useState<Album[]>([])
    const [appear, setAppear] = useState<Album[]>([])
    const [compilation, setCompilation] = useState<Album[]>([])
    const [follow, setFollow] = useState(false)
    const [uri, setUri] = useState('')

    useEffect(() => {
        setAlbum([])
        setSingle([])
        setAppear([])
        setCompilation([])
        setFollow(false)
        setUri('')
        setLoading(true)

        const controller = new AbortController()
        const { signal } = controller

        spotify<boolean[]>(`/me/following/contains?type=artist&ids=${id}`, token, {signal})
            .then(([following]) => setFollow(following === true))
            .catch(error => console.log(error))

        const albums = (group: string) => spotify<Paging<Album>>(`/artists/${id}/albums?include_groups=${group}`, token, {signal})
        Promise.all([spotify<Artist>(`/artists/${id}`, token, {signal}), albums('album'), albums('single'), albums('appears_on'), albums('compilation')])
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

    const followArtist = () => {
        spotify(`/me/following?type=artist&ids=${id}`, token, {method: follow? 'DELETE':'PUT'})
            .then(() => {
                setMessage(follow ? `Unsaved from your collection` : `Saved to your collection`)
                setFollow(!follow)
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    const playContext = () => {
        spotify('/me/player/play', token, {method: 'PUT', body: {context_uri: uri}})
            .then(() => setTimeout(() => setPlay(), 500))
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    return (
        loading ? 
            <Loading /> 
            : 
            <div className='listPage'>
                <PageBanner pageTitle='artist' bannerInfo={bannerInfo}/>
                <div className="playListContent">
                    <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                    <PlayListFunctions type='artist' follow={follow} onFollow={followArtist} playContext={playContext}/>
                    <div className="page-content">
                        <AboutMenu album={album} single={single} appear={appear} compilation={compilation}/>
                    </div>
                </div>
            </div>
    )
}
