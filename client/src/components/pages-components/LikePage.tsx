import React from 'react';
import {useEffect, useState, useContext} from 'react'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'

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
    const [setNext, lastRef] = useInfiniteScroll(setTracks, toTrack)

    useEffect(() => {
        const controller = new AbortController()
        spotify<Paging<{track: Track}>>('/me/tracks?limit=50', {signal: controller.signal})
            .then((data) => {
                setTracks(data.items.map(toTrack))
                setNext(data.next)
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    // eslint-disable-next-line
    }, [])

    return (
        <div className='listPage' style={{display: `${tracks.length===0? 'none':'block'}`}}>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                {/* Liked Songs has no context URI to play, so the loaded tracks become the queue. */}
                <PlayListFunctions type='playOnly' start={{uris: tracks.map(track => track.uri)}}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks}/>
                </div>
            </div>
        </div>
    );
}

export default LikePage;
