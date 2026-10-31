import React from 'react'
import Icon from '../icons'
import MoreMenu, { type MenuItem } from './MoreMenu'
import usePlayback from '../../utilities/hooks/usePlayback'

type Props = {
    type?: 'playOnly' | 'none' | 'artist',
    follow?: boolean,
    onFollow?: () => void,
    uri?: string,
    // What to play when `uri` isn't loaded yet; defaults to `uri` as the context.
    start?: object,
    // The "• • •" menu, labelled with the page's name.
    menu?: MenuItem[],
    label?: string,
}

export default function PlayListFunctions({type, follow = false, onFollow, uri = '', start = {context_uri: uri}, menu = [], label = ''}: Props) {
    const more = menu.length > 0 && <MoreMenu items={menu} label={label}/>

    switch (type) {
        case 'playOnly':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge uri={uri} start={start}/>
                </div>
            )
        case 'none':
            return (
                <div className="playListFunctions">
                    {more}
                </div>
            )
        case 'artist':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge uri={uri} start={start}/>
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    {more}
                </div>
            )
        default:
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge uri={uri} start={start}/>
                    {onFollow && <LikeButton follow={follow} onFollow={onFollow}/>}
                    {more}
                </div>
            )
    }
}


function PlayButtonLarge({uri, start}: {uri: string, start: object}){
    const {isPlaying, toggle} = usePlayback()
    const playing = isPlaying(uri)
    return (
        <button className="playButton no-outline" title={playing ? 'Pause' : 'Play'} aria-label={playing ? 'Pause' : 'Play'} onClick={() => toggle(uri, start)}>
            <Icon name={playing ? 'Pause' : 'Play'} height='28' width='28'/>
        </button>
    )
}

function LikeButton({follow, onFollow}: {follow: boolean, onFollow?: () => void}){
    return (
        <button className={`likeButton ${follow? 'noHover':''} no-outline`} style={{color: follow? 'var(--spotify-green)':undefined}} title={follow? 'Remove from Your Library':"Save to Your Library"} aria-label={follow? 'Remove from Your Library':"Save to Your Library"} aria-pressed={follow} onClick={onFollow}>
            <Icon name='Heart' fill={follow}/>
        </button>
    )
}

function FollowButton({follow, onFollow}: {follow: boolean, onFollow?: () => void}){
    return (
        <button className="followButton no-outline" aria-pressed={follow} onClick={onFollow}>{follow? 'following':'follow'}</button>
    )
}
