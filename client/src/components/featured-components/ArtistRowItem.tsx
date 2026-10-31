import React from 'react';
import { Link } from 'react-router';
import Icon from '../icons'
import type { Album } from '../../utilities/types';

const ArtistRowItem = ({info}: {info: Album}) => {
    const {name, type, id, images} = info 
    const thumbNail = images[0]?.url

    return (
        <div className='artistRowItem'>
            <Link to={`/${type}/${id}`}>
                <div className='artistRowThumb'>
                    {thumbNail? 
                        <img loading="lazy" src={thumbNail} style={{width:'100%', height:'100%'}} alt="" />: 
                        <div>
                            <Icon name='CD'/>
                        </div>}
                </div>
            </Link>
            <div className="artistRowName ellipsis-one-line">
                <Link to={`/${type}/${id}`}>{name}</Link>
            </div>
        </div>
    );
}

export default ArtistRowItem;
