import React from 'react';
import ArtistRowItem from './ArtistRowItem'
import type { Album } from '../../utilities/types';

const ArtistRowGrid = ({list}: {list: Album[]}) => {
    return (
        <div className='ArtistRowGrid'> 
            {list.map((item, index) => <ArtistRowItem key={index} info={item}/>)}
        </div>
    );
}

export default ArtistRowGrid;
