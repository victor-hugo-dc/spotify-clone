import React from 'react';

import ArtistRow from './ArtistRow';
import type { Album } from '../../utilities/types';

type Props = {album: Album[], single: Album[], appear: Album[], compilation: Album[]}

const AboutMenu = ({album, single, appear, compilation}: Props) => {
    return (
        <div style={{paddingTop: '1.5em', position:"relative"}}>
            <ArtistRow title='Albums' list={album}/> 
            <ArtistRow title='Singles and EPs' list={single}/> 
            <ArtistRow title='Compilations' list={compilation}/> 
            <ArtistRow title='Appears On' list={appear}/> 
        </div>
    );
}



export default AboutMenu;
