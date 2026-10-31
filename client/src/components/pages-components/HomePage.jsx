import React from 'react'

import CollectionRow from '../featured-components/CollectionRow'


export default function HomePage() {
    return (
        <div className="page-content">
            <div className='pageContent'>
                <CollectionRow name='Uniquely Yours' playlists={[{type:'link', id:'liked-songs', to:'/tracks', description:'', name:'Liked Songs', images:[{url: 'https://misc.scdn.co/liked-songs/liked-songs-300.png'}]}]}/>
            </div>
        </div>
    )
}
