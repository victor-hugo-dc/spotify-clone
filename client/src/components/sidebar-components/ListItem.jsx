import React from 'react';
import {NavLink} from 'react-router'

//Linked list items
function ListItem({name, id}) {
    return (
        <li className='side-list'>
            <NavLink to={`/playlist/${id}`} className='list-link' style={({isActive}) => isActive ? {color: '#fff'} : undefined}>
                <div className="list-wrapper">
                    {name}
                </div>
            </NavLink>
        </li>
    );
}

export default ListItem;
