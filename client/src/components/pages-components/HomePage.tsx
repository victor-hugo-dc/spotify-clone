import React, {useContext, useEffect, useState} from 'react'

import CollectionRow from '../featured-components/CollectionRow'
import {TokenContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Artist, LinkCard, Paging, Track } from '../../utilities/types'

const likedSongs: LinkCard = {type: 'link', id: 'liked-songs', to: '/tracks', description: '', name: 'Liked Songs', images: [{url: 'https://misc.scdn.co/liked-songs/liked-songs-300.png'}]}

// Spotify no longer lets Development Mode apps browse its categories, so Home shows the user's own top picks.
export default function HomePage() {
    const token = useContext(TokenContext)
    const [topArtists, setTopArtists] = useState<Artist[]>([])
    const [topTracks, setTopTracks] = useState<Track[]>([])

    useEffect(() => {
        const controller = new AbortController()
        spotify<Paging<Artist>>('/me/top/artists?limit=9', token, {signal: controller.signal})
            .then((page) => setTopArtists(page.items))
            .catch((error) => console.log(error))
        spotify<Paging<Track>>('/me/top/tracks?limit=9', token, {signal: controller.signal})
            .then((page) => setTopTracks(page.items))
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [token])

    return (
        <div className="page-content">
            <div className='pageContent'>
                <CollectionRow name='Uniquely Yours' playlists={[likedSongs]}/>
                {topArtists.length > 0 && <CollectionRow name='Your Top Artists' playlists={topArtists}/>}
                {topTracks.length > 0 && <CollectionRow name='Your Top Tracks' playlists={topTracks}/>}
            </div>
        </div>
    )
}
