import React, {Component} from 'react';
import Icon from '../icons'
import {NavLink} from 'react-router'

class FeaturedItem extends Component {
    render() {
        const { exact, to, label } = this.props;
        return (
                <NavLink end={exact} to={to} className={({isActive}) => `featured-item-link${isActive ? ' activeMainNav' : ''}`} style={this.props.style}>
                    <div className="playlist-icon">
                        <Icon name='Like' />
                    </div>
                    <span className="featured-label">{label}</span>
                </NavLink>
        );
    }
}

export default FeaturedItem;


