import React, { Component } from 'react';
import Icon from '../icons'
import {NavLink} from 'react-router'

class NavItem extends Component {
    render() {
      const { exact, to, label } = this.props;

      return (
        <li className="NavItem">
          <NavLink to={to} end={exact} className={({isActive}) => `nav-link${isActive ? ' activeMainNav' : ''}`} style={this.props.style}>
            <div className="nav-icon">
              <Icon name={this.props.name} />
            </div>
            <span>{label}</span>
          </NavLink>
        </li>
      );
    }
  }

export default NavItem;
