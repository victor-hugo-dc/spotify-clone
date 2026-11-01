import React, { useContext, useEffect, useState } from 'react'
import { NavLink } from 'react-router'

import Logo from './Logo'
import HistoryNav from './HistoryNav'
import SearchBar from './SearchBar'
import UserInfo from './UserInfo'
import Icon from '../icons'
import { LayoutContext, LibraryContext } from '../../utilities/context'
import { api } from '../../utilities/api'
import { isNew, loadReleases, onSeen, type Notifications } from '../../utilities/notifications'

// Spotify's top bar: the logo and history at the left, home and search in the middle, the account at the right.
export default function TopBar() {
    const { rightPanel, setRightPanel, wide } = useContext(LayoutContext)
    const friends = rightPanel === 'friends'
    const unread = useUnread()

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
                <NavLink to='/whats-new' className='top-bar-button no-outline' aria-label={unread ? "What's New (new)" : "What's New"} title="What's New">
                    <Icon name='Bell' width='20' height='20' />
                    {unread && <span className='top-bar-dot'></span>}
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

// Whether What's New has anything you haven't seen: a notification or a release since you last opened it. Checked when
// the app loads (and once Your Library has your artists), every 2 minutes while the tab is in view, when it comes back
// into view, and once What's New has marked everything seen. Releases come from the browser's cache, mostly.
function useUnread() {
    const artists = useContext(LibraryContext).artists.map((artist) => artist.id).join()
    const [unread, setUnread] = useState(false)

    useEffect(() => {
        // Only the latest check counts: one from before What's New marked things seen can land after it.
        let latest = 0
        const check = () => {
            const n = ++latest
            Promise.all([api<Notifications>('/notifications'), loadReleases(artists ? artists.split(',') : [])])
                .then(([{notifications, seenAt}, releases]) => {
                    if (n === latest) setUnread([...notifications, ...releases].some((item) => isNew(item, seenAt)))
                }, (error) => console.log(error))
        }
        const ifVisible = () => !document.hidden && check()
        check()
        const timer = setInterval(ifVisible, 2 * 60 * 1000)
        document.addEventListener('visibilitychange', ifVisible)
        const stop = onSeen(check)
        return () => {
            latest = -1
            clearInterval(timer)
            document.removeEventListener('visibilitychange', ifVisible)
            stop()
        }
    }, [artists])

    return unread
}
