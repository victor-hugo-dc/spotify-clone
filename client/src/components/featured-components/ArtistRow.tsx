import React from 'react';
import ArtistRowTitle from './ArtistRowTitle'
import ArtistRowGrid from './ArtistRowGrid'
import type { Album } from '../../utilities/types';

const ArtistRow = ({title, list}: {title: string, list: Album[]}) => {
    if (list.length > 0) {
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
