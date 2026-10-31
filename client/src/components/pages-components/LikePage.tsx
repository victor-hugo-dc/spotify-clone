import React from 'react';
import {useEffect, useState, useContext} from 'react'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'
import LoadError from '../featured-components/LoadError'

import {UserContext} from '../../utilities/context'
import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import { spotify } from '../../utilities/spotify'
import type { Paging, Track } from '../../utilities/types'

const toTrack = (saved: {track: Track}) => saved.track

const LikePage = () => {
    const user = useContext(UserContext);


    const bannerInfo: BannerInfo = {
        name: 'Liked Songs',
        user: user ? [user] : [],
        primary_color: 'rgb(70, 62, 118)',
        images: [{url: 'https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png'}],
    }
    const [tracks, setTracks] = useState<Track[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')
    const [setNext, lastRef] = useInfiniteScroll(setTracks, toTrack)

    useEffect(() => {
        const controller = new AbortController()
        spotify<Paging<{track: Track}>>('/me/tracks?limit=50', {signal: controller.signal})
            .then((data) => {
                setTracks(data.items.map(toTrack))
                setNext(data.next)
                setLoaded(true)
            })
            .catch((error) => setError(error.message))
        return () => controller.abort()
    // eslint-disable-next-line
    }, [])

    if (error) return <LoadError what='list' error={error}/>
    if (!loaded) return <Loading/>

    return (
        <div className='listPage'>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                {/* shortcut: Liked Songs has no context URI to play, so the queue is the tracks loaded so far (50 per page
                    scrolled); switch to a context if Spotify ever offers one for Development Mode apps. */}
                {tracks.length > 0 && <PlayListFunctions type='playOnly' start={{uris: tracks.map(track => track.uri)}}/>}
                <div className="page-content">
                    {tracks.length === 0 ?
                        <p className='empty-state'>Songs you like will appear here. Save songs by tapping the heart icon.</p> :
                        <TrackList ref={lastRef} tracks={tracks}/>
                    }
                </div>
            </div>
        </div>
    );
}

export default LikePage;
