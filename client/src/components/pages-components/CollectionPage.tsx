import React, {useContext} from 'react';
import {Routes, Route, Navigate} from 'react-router'

import RowGrid from '../featured-components/RowGrid'
import CollectionNav from '../featured-components/CollectionNav'

import { LibraryContext } from '../../utilities/context'
import type { LinkCard } from '../../utilities/types'
import '../../styles/pages.css'

// Your Library over the whole page, as Spotify's Expand shows it: a title and chips that stay put, over a grid of cards.
const CollectionPage = () => {
    const {playlists, artists, albums, likedTotal} = useContext(LibraryContext)
    const liked: LinkCard = {
        type: 'link', id: 'liked-songs', to: '/tracks', name: 'Liked Songs', images: [{url: 'https://misc.scdn.co/liked-songs/liked-songs-300.png'}],
        description: likedTotal === null ? 'Playlist' : `Playlist • ${likedTotal.toLocaleString('en-US')} ${likedTotal === 1 ? 'song' : 'songs'}`,
    }

    return (
        <div className='page-content collection-page'>
            <div className='collection-header'>
                <h1 className='collection-title'>Your Library</h1>
                <CollectionNav/>
            </div>
            <div className='collection-grid'>
                <Routes>
                    <Route path='playlist' element={<RowGrid playlists={[liked, ...playlists]}/>}/>
                    <Route path='artist' element={<RowGrid playlists={artists}/>}/>
                    <Route path='album' element={<RowGrid playlists={albums.map((saved) => saved.album)}/>}/>
                    <Route path='*' element={<Navigate to='/collection/playlist' replace/>}/>
                </Routes>
            </div>
        </div>
    );
}


export default CollectionPage;
