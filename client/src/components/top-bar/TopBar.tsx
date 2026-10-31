import React, { useContext } from 'react'
import { NavLink } from 'react-router'

import Logo from './Logo'
import HistoryNav from './HistoryNav'
import SearchBar from './SearchBar'
import UserInfo from './UserInfo'
import Icon from '../icons'
import { LayoutContext } from '../../utilities/context'

// Spotify's top bar: the logo and history at the left, home and search in the middle, the account at the right.
export default function TopBar() {
    const { rightPanel, setRightPanel, wide } = useContext(LayoutContext)
    const friends = rightPanel === 'friends'

    return (
        <header className='top-bar'>
            <div className='top-bar-left'>
                <Logo />
                <HistoryNav />
            </div>

            <div className='top-bar-center'>
                <NavLink to='/' end className='top-bar-home no-outline' aria-label='Home' title='Home'>
                    <Icon name='House' />
                </NavLink>
                <SearchBar />
            </div>

            <div className='top-bar-right'>
                {/* A new tab, so leaving doesn't stop what's playing in this one. */}
                <a href='https://www.spotify.com/download' className='top-bar-install no-outline' target='_blank' rel='noopener noreferrer'>
                    <Icon name='Download' width='20' height='20' />
                    <span>Install App</span>
                </a>
                <NavLink to='/social' className='top-bar-button no-outline' aria-label="What's New" title="What's New">
                    <Icon name='Bell' width='20' height='20' />
                </NavLink>
                {wide &&
                    <button className={`top-bar-button no-outline${friends ? ' active' : ''}`} aria-label='Friend Activity' title='Friend Activity'
                            aria-pressed={friends} onClick={() => setRightPanel(friends ? null : 'friends')}>
                        <Icon name='Friends' width='20' height='20' />
                    </button>
                }
                <UserInfo />
            </div>
        </header>
    )
}
