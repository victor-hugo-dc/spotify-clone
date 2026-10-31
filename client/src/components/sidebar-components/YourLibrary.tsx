import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router'

import FeaturedPlaylist from './FeaturedPlaylist'
import FeaturedItem from './FeaturedItem'
import OtherPlaylist from './OtherPlaylist'
import { LibraryContext, MessageContext } from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { Playlist } from '../../utilities/types'
import '../../styles/library.css'

// The left panel: Create, Liked Songs and your playlists.
export default function YourLibrary() {
    const { playlists, refresh } = useContext(LibraryContext)
    const setMessage = useContext(MessageContext)
    const navigate = useNavigate()

    // New playlists get Spotify's default name, numbered the way its apps do.
    const createPlaylist = () => {
        spotify<Playlist>('/me/playlists', {method: 'POST', body: {name: `My Playlist #${playlists.length + 1}`}})
            .then((playlist) => {
                refresh()
                navigate(`/playlist/${playlist.id}`)
            })
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    return (
        <aside className='library' aria-label='Your Library'>
            <h1 className='play-title'><Link to='/collection'>Your Library</Link></h1>
            <FeaturedPlaylist onCreatePlaylist={createPlaylist}>
                <FeaturedItem to='/tracks' exact={true} label='Liked Songs'/>
            </FeaturedPlaylist>
            <hr className="list-separator"/>
            <OtherPlaylist playlists={playlists}/>
        </aside>
    )
}
