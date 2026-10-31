import React from 'react';

import ArtistRow from './ArtistRow';

const AboutMenu = ({album, single, appear, compilation}) => {
    return (
        <div style={{paddingTop: '1.5em', position:"relative"}}>
            <ArtistRow title='Albums' list={album}/> 
            <ArtistRow title='Singles and EPs' list={single}/> 
            <ArtistRow title='Compilations' list={appear}/> 
            <ArtistRow title='Appears On' list={compilation}/> 
        </div>
    );
}



export default AboutMenu;
