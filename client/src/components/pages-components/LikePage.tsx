import React from 'react';
import {useEffect, useState, useContext} from 'react'

import PageBanner, { type BannerInfo } from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList from '../featured-components/TrackList'

import {MessageContext, TokenContext, UserContext} from '../../utilities/context'
import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import { spotify } from '../../utilities/spotify'
import type { Paging, Track } from '../../utilities/types'

const toTrack = (saved: {track: Track}) => saved.track

const LikePage = () => {
    const token = useContext(TokenContext);
    const user = useContext(UserContext);
    const setMessage = useContext(MessageContext);


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
        spotify<Paging<{track: Track}>>('/me/tracks?limit=50', token, {signal: controller.signal})
            .then((data) => {
                setTracks(data.items.map(toTrack))
                setNext(data.next)
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    // eslint-disable-next-line
    }, [token])

    // Liked Songs has no context URI to play, so send the loaded tracks as the queue.
    const play = (offset?: string) => {
        const body = {uris: tracks.map(track => track.uri), offset: offset ? {uri: offset} : undefined}
        spotify('/me/player/play', token, {method: 'PUT', body})
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    return (
        <div className='listPage' style={{display: `${tracks.length===0? 'none':'block'}`}}>
            <PageBanner pageTitle='playlist' bannerInfo={bannerInfo}/>
            <div className="playListContent">
                <div className="playListOverlay" style={{backgroundColor: `${bannerInfo.primary_color}`}}></div>
                <PlayListFunctions type='playOnly' playContext={() => play()}/>
                <div className="page-content">
                    <TrackList ref={lastRef} tracks={tracks} playContextTrack={play}/>
                </div>
            </div>
        </div>
    );
}

export default LikePage;
