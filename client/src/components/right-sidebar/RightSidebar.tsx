import React, { useContext } from 'react'

import Icon from '../icons'
import { LayoutContext, NowPlayingContext, type RightPanel } from '../../utilities/context'
import '../../styles/right-sidebar.css'

// The aside's accessible name for each view.
const titles: Record<NonNullable<RightPanel>, string> = { 'now-playing': 'Now playing view', queue: 'Queue', friends: 'Friend Activity' }

// The right panel: the Now playing view, the queue or Friend Activity, whichever LayoutContext says, in a window wide
// enough for it. The Now playing view only shows while a track is loaded.
export default function RightSidebar() {
    const { rightPanel, setRightPanel, wide } = useContext(LayoutContext)
    const { track } = useContext(NowPlayingContext)
    if (!wide || rightPanel === null || (rightPanel === 'now-playing' && !track)) return null
    const cover = track?.album.images[0]?.url

    return (
        <aside className='right-sidebar' aria-label={titles[rightPanel]}>
            <header className='right-sidebar-header'>
                <h2>{titles[rightPanel]}</h2>
                <button className='right-sidebar-close no-outline' aria-label='Close' title='Close' onClick={() => setRightPanel(null)}>
                    <Icon name='Close' width='20' height='20' />
                </button>
            </header>
            {rightPanel === 'now-playing' && track &&
                <div className='right-sidebar-track'>
                    {cover ? <img src={cover} alt='' /> : <div className='right-sidebar-cover' />}
                    <h3>{track.name}</h3>
                    <p>{track.artists.map((artist) => artist.name).join(', ')}</p>
                </div>
            }
        </aside>
    )
}
