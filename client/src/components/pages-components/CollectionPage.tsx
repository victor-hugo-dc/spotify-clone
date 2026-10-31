import React, {useContext} from 'react';
import {Routes, Route, Navigate} from 'react-router'

import CollectionRow from '../featured-components/CollectionRow'
import CollectionNav from '../featured-components/CollectionNav'

import { LibraryContext } from '../../utilities/context'
import '../../styles/pages.css'

const CollectionPage = () => {
    const {playlists, artists, albums} = useContext(LibraryContext)

    return (
        <div className='page-content' style={{paddingTop:'16px'}}>
            <CollectionNav/>
            <Routes>
                <Route path='playlist' element={<CollectionRow name='Playlists' playlists={playlists}/>}/>
                <Route path='artist' element={<CollectionRow name='Artists' playlists={artists}/>}/>
                <Route path='album' element={<CollectionRow name='Albums' playlists={albums.map((saved) => saved.album)}/>}/>
                <Route path='*' element={<Navigate to='/collection/playlist' replace/>}/>
            </Routes>
        </div>
    );
}


export default CollectionPage;
