import React from 'react';
import {useEffect, useState, useContext} from 'react'

import PageBanner from '../featured-components/PageBanner'
import PlayListFunctions from '../featured-components/PlayListFunctions'
import TrackList, { type Listed } from '../featured-components/TrackList'
import Loading from '../featured-components/Loading'
import LoadError from '../featured-components/LoadError'
import Icon from '../icons'

import {UserContext} from '../../utilities/context'
import useInfiniteScroll from '../../utilities/hooks/useInfiniteScroll'
import useListView from '../../utilities/hooks/useListView'
import usePlayback from '../../utilities/hooks/usePlayback'
import { spotify } from '../../utilities/spotify'
import { songStats } from '../../utilities/lists'
import type { Paging, Track } from '../../utilities/types'
import '../../styles/lists.css'

const toTrack = ({track, added_at}: {track: Track, added_at?: string}): Listed => ({...track, added_at})

const LikePage = () => {
    const user = useContext(UserContext);
    const {nowPlaying, isStarted} = usePlayback();
    const [view, setView] = useListView()

    const [tracks, setTracks] = useState<Listed[]>([])
    const [total, setTotal] = useState<number>()
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')
    const [setNext, lastRef] = useInfiniteScroll(setTracks, toTrack)

    useEffect(() => {
        const controller = new AbortController()
        spotify<Paging<{track: Track, added_at?: string}>>('/me/tracks?limit=50', {signal: controller.signal})
            .then((data) => {
                setTracks(data.items.map(toTrack))
                setTotal(data.total)
                setNext(data.next)
                setLoaded(true)
            })
            .catch((error) => setError(error.message))
        return () => controller.abort()
    // eslint-disable-next-line
    }, [])

    if (error) return <LoadError what='list' error={error}/>
    if (!loaded) return <Loading/>

    const uris = tracks.map((track) => track.uri)
    // Liked Songs has no context to play (see below), so the big button goes by the track playing while the list Shoutify
    // started from here plays, and otherwise by the context Spotify's own apps play it with: your collection.
    const collection = user ? `spotify:user:${user.id}:collection` : ''
    const uri = isStarted(uris) ? nowPlaying.trackUri ?? '' : collection

    return (
        <div className='listPage lists'>
            <PageBanner
                pageTitle='playlist'
                bannerInfo={{name: 'Liked Songs', user: user ? [user] : [], primary_color: 'rgb(80, 56, 160)', stats: songStats(total, tracks)}}
                cover={<div className='likedCover'><Icon name='Heart' fill/></div>}
            />
            <div className="playListContent">
                {/* shortcut: Liked Songs has no context URI to play, so the queue is the tracks loaded so far (50 per page
                    scrolled); switch to a context if Spotify ever offers one for Development Mode apps. */}
                {tracks.length > 0 && <PlayListFunctions uri={uri} start={{uris}} label='Liked Songs' view={view} onView={setView}/>}
                <div className="page-content">
                    {tracks.length === 0 ?
                        <p className='empty-state'>Songs you like will appear here. Save songs by tapping the plus icon.</p> :
                        <TrackList ref={lastRef} tracks={tracks} liked compact={view === 'compact'}/>
                    }
                </div>
            </div>
        </div>
    );
}

export default LikePage;
