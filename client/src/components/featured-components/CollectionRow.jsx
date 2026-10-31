import React from 'react'
import RowTitle from './RowTitle'
import RowGrid from './RowGrid'


 const CollectionRow = React.forwardRef(({name, playlists}, ref) => {
    if (name === 'Albums') {
        playlists = playlists.map(item => item.album);
    }
    return (
        <div className="CollectionRow">
            <RowTitle title={name}/>
            <RowGrid ref={ref} playlists={playlists}/>
        </div>
    )
})

export default CollectionRow