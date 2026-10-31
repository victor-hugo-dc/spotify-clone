import React, {useState, useEffect, useContext} from 'react'
import {useParams} from 'react-router'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PageTitle from '../featured-components/PageTitle'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import { shareItems } from '../featured-components/MoreMenu'
import CollectionRow from '../featured-components/CollectionRow'
import Loading from '../featured-components/Loading'

import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import {UserContext, MessageContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Paging, Playlist } from '../../utilities/types'
import '../../styles/lists.css'

const emptyBanner: BannerInfo = {name: '', user: []}

// Since 2026 Spotify only shares the logged-in user's own profile and playlists with Development Mode apps.
export default function UserPage() {
    const { id = '' } = useParams()
    const user = useContext(UserContext)
    const setStatusMessage = useContext(MessageContext)
    const [loading, setLoading] = useState(true)

    const [bannerInfo, setbannerInfo] = useState(emptyBanner)

    const [playLists, setplayLists] = useState<Playlist[]>([])
    const [setNext, lastRef] = useInfiniteScroll(setplayLists)
    useEffect(() => {
        if (!user || id !== user.id) return
        setplayLists([])
        setLoading(true)

        const controller = new AbortController()
        spotify<Paging<Playlist>>('/me/playlists', {signal: controller.signal})
            .then(({items, total, next}) => {
                setbannerInfo({...emptyBanner, name: user.display_name ?? user.id, images: user.images, stats: total === undefined ? undefined : `${total} Playlist${total === 1 ? '' : 's'}`})
                setplayLists(items)
                setNext(next)
                setLoading(false)
            })
            .catch((error) => {
                setStatusMessage(`ERROR: ${error.message}`)
                setLoading(false)
            })

        return () => controller.abort()
    // eslint-disable-next-line
    }, [id, user])

    if (user && id !== user.id) {
        return (
            <div className='page-content' style={{paddingTop: '16px'}}>
                <PageTitle name="Spotify doesn't share other people's profiles with this app."/>
                <a href={`https://open.spotify.com/user/${id}`} target='_blank' rel='noopener noreferrer' style={{color: '#fff'}}>Open this profile on Spotify</a>
            </div>
        )
    }

    return (
        loading? 
        <Loading /> 
        :
        <div className='listPage lists'>
            <PageBanner pageTitle='profile' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <PlayListFunctions type='none' label={bannerInfo.name} menu={shareItems(`spotify:user:${id}`, 'profile', setStatusMessage)}/>
                <div className="page-content">
                    <CollectionRow ref={lastRef} name='Playlists' playlists={playLists}/>
                </div>
            </div>
        </div>
    )
}
