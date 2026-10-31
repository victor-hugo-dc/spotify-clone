import React, {useState, useEffect, useContext} from 'react';
import {Routes, Route, Navigate} from 'react-router'

import CollectionRow from '../featured-components/CollectionRow'

import {TokenContext} from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Album, Artist, Paging, Playlist } from '../../utilities/types'

const CollectionPage = ({playlists}: {playlists: Playlist[]}) => {
    const [artists, setArtists] = useState<Artist[]>([])
    const [albums, setAlbums] = useState<Album[]>([])

    const token = useContext(TokenContext)

    useEffect(() => {
        const controller = new AbortController()

        spotify<{artists: Paging<Artist>}>('/me/following?type=artist', token, {signal: controller.signal})
            .then((data) => setArtists(data.artists.items))
            .catch((error) => console.log(error))

        spotify<Paging<{album: Album}>>('/me/albums', token, {signal: controller.signal})
            .then((data) => setAlbums(data.items.map(item => item.album)))
            .catch((error) => console.log(error))

        return () => controller.abort()
    }, [token])

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
