import React from 'react';
import {NavLink} from 'react-router'

const CollectionNav = () => {
    return (
        <div className='cNavWrapper'>
            <nav className='cNav'>
                <ul className='cNavList'>
                    <li>
                        <NavLink to='/collection/playlist' style={({isActive}) => isActive ? activeStyle : undefined}>Playlists</NavLink>
                    </li>
                    <li>
                        <NavLink to='/collection/artist' style={({isActive}) => isActive ? activeStyle : undefined}>Artists</NavLink>
                    </li>
                    <li>
                        <NavLink to='/collection/album' style={({isActive}) => isActive ? activeStyle : undefined}>Albums</NavLink>
                    </li>
                </ul>
            </nav>
        </div>
    );
}

const activeStyle = {
    backgroundColor: '#333'
}

export default CollectionNav;
