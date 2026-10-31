import React from 'react';
import Icon from '../icons'
import {NavLink} from 'react-router'

export default function FeaturedItem({to, exact, label}: {to: string, exact?: boolean, label: string}) {
    return (
            <NavLink end={exact} to={to} className={({isActive}) => `featured-item-link${isActive ? ' activeMainNav' : ''}`}>
                <div className="playlist-icon">
                    <Icon name='Like' />
                </div>
                <span className="featured-label">{label}</span>
            </NavLink>
    );
}
