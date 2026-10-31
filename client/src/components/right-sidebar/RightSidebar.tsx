import React, { useContext, useEffect, useRef } from 'react'
import { Link } from 'react-router'

import Icon from '../icons'
import NowPlayingView from './NowPlayingView'
import QueueView from './QueueView'
import FriendActivity from './FriendActivity'
import { playingContext } from './playingContext'
import { LayoutContext, LibraryContext, NowPlayingContext, type RightPanel } from '../../utilities/context'
import '../../styles/right-sidebar.css'

// The aside's accessible name for each view.
const titles: Record<NonNullable<RightPanel>, string> = { 'now-playing': 'Now playing view', queue: 'Queue', friends: 'Friend Activity' }

// The right panel: the Now playing view, the queue or Friend Activity, whichever LayoutContext says, in a window wide
// enough for it. The Now playing view only shows while a track is loaded.
export default function RightSidebar() {
    const { rightPanel, setRightPanel, wide } = useContext(LayoutContext)
    const { track, contextUri } = useContext(NowPlayingContext)
    const library = useContext(LibraryContext)
    // Close gives focus back to the button that opened this view (it had focus then), or else to the page, so it
    // doesn't drop to <body> as the panel goes.
    const opener = useRef<HTMLElement | null>(null)
    useEffect(() => {
        const focused = document.activeElement
        opener.current = focused instanceof HTMLElement && focused !== document.body ? focused : null
    }, [rightPanel])
    if (!wide || rightPanel === null || (rightPanel === 'now-playing' && !track)) return null
    const close = () => {
        setRightPanel(null)
        const back = opener.current?.isConnected ? opener.current : document.querySelector('main')
        back?.focus()
    }
    // As on Spotify, the Now playing view is headed by what the song plays from. Not a heading: the page has its own
    // heading with that name.
    const header = rightPanel === 'now-playing' ? playingContext(contextUri, library, track) : { name: titles[rightPanel], path: null }

    return (
        <aside className='right-sidebar' aria-label={titles[rightPanel]}>
            <header className='right-sidebar-header'>
                {header.path ?
                    <Link to={header.path} className='right-sidebar-title ellipsis-one-line'>{header.name}</Link> :
                    <span className='right-sidebar-title ellipsis-one-line'>{header.name}</span>}
                <button className='right-sidebar-close no-outline' aria-label='Close' title='Close' onClick={close}>
                    <Icon name='Close' width='20' height='20' />
                </button>
            </header>
            {rightPanel === 'now-playing' && track && <NowPlayingView track={track} />}
            {rightPanel === 'queue' && <QueueView />}
            {rightPanel === 'friends' && <FriendActivity />}
        </aside>
    )
}
