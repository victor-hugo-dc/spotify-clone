import React, {useState, useEffect, useContext} from 'react'
import {useParams} from 'react-router'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import CollectionRow from '../featured-components/CollectionRow'
import Loading from '../featured-components/Loading'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import {UserContext, TokenContext, MessageContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Paging, Playlist, User } from '../../utilities/types'

const emptyBanner: BannerInfo = {name: '', user: [], primary_color: 'rgb(83, 83, 83)'}

export default function UserPage() {
    const { id = '' } = useParams()
    const user = useContext(UserContext)
    const token = useContext(TokenContext)
    const setStatusMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [playLists, setplayLists] = useState<Playlist[]>([])
    const [setNext, lastRef] = useInfiniteScroll(setplayLists)
    const [follow, setFollow] = useState(false)
    useEffect(() => {
        setbannerInfo(emptyBanner)
        setFollow(false)
        setplayLists([])
        setLoading(true)

        const controller = new AbortController()
        const { signal } = controller
        Promise.all([spotify<User>(`/users/${id}`, token, {signal}), spotify<Paging<Playlist>>(`/users/${id}/playlists`, token, {signal})])
            .then(([userData, listData]) => {
                const {items, total, next} = listData
                setbannerInfo({...emptyBanner, name: userData.display_name ?? id, images: userData.images, total})
                setplayLists(items)
                setNext(next)
                setLoading(false)
            })
            .catch((error) => {
                setStatusMessage(`ERROR: ${error.message}`)
                setLoading(false)
            })

        spotify<boolean[]>(`/me/following/contains?type=user&ids=${id}`, token, {signal})
            .then(([following]) => setFollow(following === true))
            .catch(error => console.log(error))

        return () => controller.abort()
    // eslint-disable-next-line
    }, [id])

    const followUser = () => {
        spotify(`/me/following?type=user&ids=${id}`, token, {method: follow? 'DELETE':'PUT'})
            .then(() => {
                setStatusMessage(follow ? `Unsaved from your collection` : `Saved to your collection`)
                setFollow(!follow)
            })
            .catch(error => setStatusMessage(`ERROR: ${error.message}`))
    }

    return (
        loading? 
        <Loading /> 
        :
        <div className='listPage' style={{display: playLists.length===0? 'none':'block'}}>
            <PageBanner pageTitle='profile' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions type={id === user?.id? 'none':'user'} follow={follow} onFollow={followUser}/>
                <div className="page-content" style={{marginTop: '40px'}}>
                    <CollectionRow ref={lastRef} name='Public Playlists' playlists={playLists}/>
                </div>
            </div>
        </div>
    )
}
