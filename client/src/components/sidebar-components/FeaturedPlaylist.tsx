import React, { type ReactNode } from 'react';
import CreatePLaylist from './CreatePlaylist'



//Featured playlist containing 2 main components - the button to make a new playlist and a featured item (the liked songs playlist)
function FeaturedPlaylist({children, onCreatePlaylist}: {children: ReactNode, onCreatePlaylist: () => void}) {
    return (
        <>
            <div className="featured-playlists">
                <CreatePLaylist onClick={onCreatePlaylist}/>
                {children}
            </div>
        </>
    );
}


export default FeaturedPlaylist;
