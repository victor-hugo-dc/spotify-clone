import React from 'react'
import {useState, useEffect, useContext} from 'react'
import axios from 'axios'

import makeAxiosRequest from '../../utilities/makeAxiosRequest'
import getLocale from '../../utilities/locale'
import useId from '../../utilities/hooks/useId'
import requestWithToken from '../../utilities/requestWithToken'
import putWithToken from '../../utilities/putWithToken'
import {TokenContext, MessageContext, PlayContext} from '../../utilities/context'

import PageBanner from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import AboutMenu from '../featured-components/AboutMenu'
import Loading from '../featured-components/Loading'

export default function ArtistPage() {
    const id = useId('artist')
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)
    const setPlay = useContext(PlayContext)

    const [bannerInfo, setbannerInfo] = useState({
        name: '',
        description: '',
        user: [],
        followers: 0,
        primary_color: 'rgb(83, 83, 83)',
        images: [],
        total: 0
    })

    const [, locale] = getLocale()

    const [album, setAlbum] = useState([])
    const [single, setSingle] = useState([])
    const [appear, setAppear] = useState([])
    const [compilation, setCompilation] = useState([])
    const [follow, setFollow] = useState(false)
    const [uri, setUri] = useState('')

    const source = axios.CancelToken.source()
    useEffect(() => {
        setAlbum([])
        setSingle([])
        setAppear([])
        setCompilation([])
        setFollow(false)
        setUri('')
        setLoading(true)
        
        const [artistSource, requestArtist] = makeAxiosRequest(`https://api.spotify.com/v1/artists/${id}`)
        const [albumSource, requestAlbum] = makeAxiosRequest(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album&country=${locale}`)
        const [singleSource, requestSingle] = makeAxiosRequest(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=single&country=${locale}`)
        const [appearSource, requestAppear] = makeAxiosRequest(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=appears_on&country=${locale}`)
        const [compilationSource, requestCompilation] = makeAxiosRequest(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=compilation&country=${locale}`)

        if (id){
            requestWithToken(`https://api.spotify.com/v1/me/following/contains?type=artist&ids=${id}`, token, source)
                .then(response => {
                    setFollow(response.data[0])
                })
                .catch(error => console.log(error))
        }
        

        const makeRequest = async ()=> {
            try{
                const [artistData, 
                        albumData, 
                        singleData, 
                        appearData, 
                        compilationData] = await Promise.all([requestArtist(), requestAlbum(), requestSingle(), requestAppear(), requestCompilation()])
                
                
                const {name, followers, primary_color, images, uri} = artistData
                setbannerInfo(bannerInfo => ({...bannerInfo, name, followers, primary_color, images}))
                setUri(uri)

                const album = albumData.items
                const single = singleData.items
                const appear = appearData.items
                const compilation = compilationData.items
                
                setAlbum((old) => [...old, ...album])
                setSingle((old) => [...old, ...single])
                setAppear((old) => [...old, ...appear])
                setCompilation((old) => [...old, ...compilation])
                setLoading(false)
            }catch(error){ 
                console.log(error)
                setLoading(false)
            }   
        }

        if (id){
            makeRequest()
        }
        return () => {
            artistSource.cancel()
            albumSource.cancel()
            singleSource.cancel()
            appearSource.cancel()
            compilationSource.cancel()
            source.cancel()
        }
    // eslint-disable-next-line
    }, [id])

    const followArtist = () => {
        putWithToken(`https://api.spotify.com/v1/me/following?type=artist&ids=${id}`, token, source, {}, follow? 'DELETE':'PUT')
            .then(response => {
                if (response.status === 204){
                    if (follow){
                        setMessage(`Unsaved from your collection`)
                    }else{
                        setMessage(`Saved to your collection`)
                    }
                    setFollow(!follow)
                }else{
                    setMessage(`ERROR: Something went wrong! Server response: ${response.status}`)
                }
            })
            .catch(error => setMessage(`ERROR: ${error}`))
    }

    const playContext = () => {
        const body = {
            context_uri: uri
        }

        putWithToken(`https://api.spotify.com/v1/me/player/play`, token, source, body)
            .then(response => {
                if (response.status === 204){
                    setTimeout(() => setPlay(), 500)
                }else{
                    setMessage(`ERROR: Something went wrong! Server response: ${response.status}`)
                }
            })
            .catch(error => setMessage(`ERROR: ${error}`))
    }

    return (
        loading ? 
            <Loading /> 
            : 
            <div className='listPage'>
                <PageBanner pageTitle='artist' bannerInfo={bannerInfo}/>
                <div className="playListContent">
                    <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                    <PlayListFunctions type='artist' follow={follow} onFollow={followArtist} setMessage={setMessage} playContext={playContext}/>
                    <div className="page-content">
                        <AboutMenu album={album} single={single} appear={appear} compilation={compilation}/>
                    </div>
                </div>
            </div>
    )
}


