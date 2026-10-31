import React from 'react';
import Icon, { type IconName } from '../icons'
import {NavLink} from 'react-router'

export default function NavItem({to, exact, name, label}: {to: string, exact?: boolean, name: IconName, label: string}) {
    return (
      <li className="NavItem">
        <NavLink to={to} end={exact} className={({isActive}) => `nav-link${isActive ? ' activeMainNav' : ''}`}>
          <div className="nav-icon">
            <Icon name={name} />
          </div>
          <span>{label}</span>
        </NavLink>
      </li>
    );
}
