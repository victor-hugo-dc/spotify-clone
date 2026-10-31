import React, { type ReactNode } from 'react';

//Playlists components - contain 2 other main component - the featured playlist link (with icons) and the other playlist (just the links)
function PlayLists({top, bottom}: {top: ReactNode, bottom: ReactNode}){
    return (
        <div className='playlists'>
            <h1 className='play-title'>Playlists</h1>
            {top}
            <hr className="list-separator"/>
            {bottom}
        </div>
    );
}

export default PlayLists;

