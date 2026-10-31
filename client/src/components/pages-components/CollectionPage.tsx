import React, {useState, useEffect} from 'react';
import {Routes, Route, Navigate} from 'react-router'

import CollectionRow from '../featured-components/CollectionRow'

import { allPages } from '../../utilities/spotify'
import type { Album, Artist, Playlist } from '../../utilities/types'

const CollectionPage = ({playlists}: {playlists: Playlist[]}) => {
    const [artists, setArtists] = useState<Artist[]>([])
    const [albums, setAlbums] = useState<Album[]>([])


    // Every followed artist and saved album, not just Spotify's first page of 20.
    useEffect(() => {
        allPages<Artist>('/me/following?type=artist&limit=50', (data) => data.artists)
            .then(setArtists)
            .catch((error) => console.log(error))

        allPages<{album: Album}>('/me/albums?limit=50')
            .then((saved) => setAlbums(saved.map(item => item.album)))
            .catch((error) => console.log(error))
    }, [])

    return (
        <div className='page-content' style={{paddingTop:'16px'}}>
            <Routes>
                <Route path='playlist' element={<CollectionRow name='Playlists' playlists={playlists}/>}/>
                <Route path='artist' element={<CollectionRow name='Artists' playlists={artists}/>}/>
                <Route path='album' element={<CollectionRow name='Albums' playlists={albums}/>}/>
                <Route path='*' element={<Navigate to='/collection/playlist' replace/>}/>
            </Routes>
        </div>
    );
}


export default CollectionPage;
