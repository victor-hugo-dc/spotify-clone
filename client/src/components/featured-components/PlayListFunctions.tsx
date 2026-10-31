import React, {useContext} from 'react'
import Icon from '../icons'
import {MessageContext} from '../../utilities/context'
import usePlayback from '../../utilities/hooks/usePlayback'

type Props = {
    type?: 'playOnly' | 'none' | 'user' | 'artist',
    follow?: boolean,
    onFollow?: () => void,
    uri?: string,
    // What to play when `uri` isn't loaded yet; defaults to `uri` as the context.
    start?: object,
}

export default function PlayListFunctions({type, follow = false, onFollow, uri = '', start = {context_uri: uri}}: Props) {
    const setMessage = useContext(MessageContext)
    const notImplemented = () => setMessage('Oops, it look like I chose not to implement this feature :)')

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
                    <MoreButton onClick={notImplemented}/>
                </div>
            )
        case 'user':
            return (
                <div className="playListFunctions">
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={notImplemented}/>
                </div>
                    
            )
        case 'artist':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge uri={uri} start={start}/>
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={notImplemented}/>
                </div>
            )
        default:
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge uri={uri} start={start}/>
                    <LikeButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={notImplemented}/>
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
        <button className={`likeButton ${follow? 'noHover':''} no-outline`} style={{color: follow? 'var(--spotify-green)':undefined}} title={follow? 'Remove from Library':"Save to Your Library"} onClick={onFollow}>
            <Icon name='Heart' fill={follow}/>
        </button>
    )
}

function FollowButton({follow, onFollow}: {follow: boolean, onFollow?: () => void}){
    return (
        <button className="followButton no-outline" onClick={onFollow}>{follow? 'following':'follow'}</button>
    )
}

function MoreButton({onClick}: {onClick: () => void}){
    return (
        <button className="moreButton no-outline" title="More" onClick={onClick}>• • •</button>
    )
}
