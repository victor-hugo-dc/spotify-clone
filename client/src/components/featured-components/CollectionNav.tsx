import React from 'react';
import {NavLink} from 'react-router'

const lists: [string, string][] = [['playlist', 'Playlists'], ['artist', 'Artists'], ['album', 'Albums']]

// Chips for Your Library's lists; NavLink marks the one on show with aria-current="page".
const CollectionNav = () => {
    return (
        <nav className='cNav' aria-label='Your Library lists'>
            <ul className='cNavList'>
                {lists.map(([path, name]) => (
                    <li key={path}>
                        <NavLink to={`/collection/${path}`} className='no-outline'>{name}</NavLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

export default CollectionNav;
