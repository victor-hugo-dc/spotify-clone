import React from 'react';
import ArtistRowTitle from './ArtistRowTitle'
import ArtistRowGrid from './ArtistRowGrid'

const ArtistRow = ({title, list}) => {
    if (list && list.length > 0) {
        return (
            <div>
                <ArtistRowTitle title={title}/>
                <ArtistRowGrid list={list}/>
            </div>
        );
    }else{
        return null
    }
}


export default ArtistRow;
