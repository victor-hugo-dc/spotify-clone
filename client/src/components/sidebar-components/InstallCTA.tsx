import React from 'react';
import Icon from '../icons'

export default function InstallCTA() {
    return (
        <div className='cta-wrapper'>
            {/* A new tab, so leaving doesn't stop what's playing in this one. */}
            <a href="https://spotify.com/download" className='nav-link' target='_blank' rel='noopener noreferrer'>
                <div className="nav-icon install-icon">
                    <Icon name='Install' viewBox='0 0 20 20' width='20px' height='20px'/>
                </div>
                <span>Install App</span>
            </a>
        </div>
    );
}
