import React, { useContext, useState } from 'react'
import Icon from '../icons'
import MoreMenu, { type MenuItem } from './MoreMenu'
import usePlayback from '../../utilities/hooks/usePlayback'
import type { ListView } from '../../utilities/hooks/useListView'
import { MessageContext } from '../../utilities/context'
import { playerCommand } from '../../utilities/spotify'

type Props = {
    // 'none': nothing to play (a profile); 'artist': Follow instead of the save button, and no download.
    type?: 'none' | 'artist',
    follow?: boolean,
    onFollow?: () => void,
    uri?: string,
    // What to play when `uri` isn't loaded yet; defaults to `uri` as the context.
    start?: object,
    // The "…" menu, labelled with the page's name.
    menu?: MenuItem[],
    label?: string,
    // The List / Compact menu at the right, for pages with a track list.
    view?: ListView,
    onView?: (view: ListView) => void,
}

// The row under a page's banner: play, shuffle, save or follow, download, "…", and how the tracks are drawn.
export default function PlayListFunctions({type, follow = false, onFollow, uri = '', start = {context_uri: uri}, menu = [], label = '', view = 'list', onView}: Props) {
    const setMessage = useContext(MessageContext)
    const playable = type !== 'none'

    return (
        <div className="playListFunctions">
            {playable && <PlayButtonLarge uri={uri} start={start}/>}
            {playable && <ShuffleButton uri={uri} start={start} label={label}/>}
            {type === 'artist' ?
                <button className="followButton no-outline" aria-pressed={follow} onClick={onFollow}>{follow ? 'Following' : 'Follow'}</button> :
                onFollow &&
                    <button className={`iconButton no-outline ${follow ? 'active' : ''}`} title={follow ? 'Remove from Your Library' : 'Save to Your Library'} aria-label={follow ? 'Remove from Your Library' : 'Save to Your Library'} aria-pressed={follow} onClick={onFollow}>
                        <Icon name={follow ? 'Saved' : 'AddCircle'}/>
                    </button>
            }
            {playable && type !== 'artist' &&
                <button className="iconButton no-outline" title='Download' aria-label='Download' onClick={() => setMessage("Downloads are only in Spotify's apps")}>
                    <Icon name='Download'/>
                </button>
            }
            {menu.length > 0 && <MoreMenu items={menu} label={label}/>}
            {onView &&
                <MoreMenu className='viewMenu' label='View as' title={`View as ${viewNames[view]}`} items={(['compact', 'list'] as const).map((option) => (
                    {label: viewNames[option], checked: option === view, onSelect: () => onView(option)}
                ))}>
                    {viewNames[view]}<Icon name='List'/>
                </MoreMenu>
            }
        </div>
    )
}

const viewNames = {list: 'List', compact: 'Compact'}

function PlayButtonLarge({uri, start}: {uri: string, start: object}){
    const {isPlaying, toggle} = usePlayback()
    const playing = isPlaying(uri)
    return (
        <button className="playButton no-outline" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} onClick={() => toggle(uri, start)}>
            <Icon name={playing ? 'Pause' : 'Play'} height='24' width='24'/>
        </button>
    )
}

// Turns Spotify's shuffle on and plays the list, unless it's already playing; pressed again, turns shuffle off.
// shortcut: green while you turned it on from this page, as the player's own shuffle state isn't shared with pages;
// read it from NowPlayingContext if that ever carries it.
function ShuffleButton({uri, start, label}: {uri: string, start: object, label: string}){
    const {nowPlaying, isPlaying, toggle} = usePlayback()
    const setMessage = useContext(MessageContext)
    const [on, setOn] = useState(false)
    const shuffle = () => playerCommand(`/me/player/shuffle?state=${!on}`, nowPlaying.deviceId, {method: 'PUT'})
        .then(() => {
            setOn(!on)
            if (!on && !isPlaying(uri)) toggle(uri, start)
        })
        .catch((error) => setMessage(`ERROR: ${error.message}`))
    return (
        <button className={`iconButton shuffleButton no-outline ${on ? 'active' : ''}`} title={`Shuffle ${label}`} aria-label={`Shuffle ${label}`} aria-pressed={on} onClick={shuffle}>
            <Icon name='Shuffle'/>
        </button>
    )
}
