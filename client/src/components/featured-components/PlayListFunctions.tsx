import React, {useContext} from 'react'
import Icon from '../icons'
import {MessageContext, PlayContext} from '../../utilities/context'

type Props = {
    type?: 'playOnly' | 'none' | 'user' | 'artist',
    follow?: boolean,
    onFollow?: () => void,
    playContext?: () => void,
}

export default function PlayListFunctions({type, follow = false, onFollow, playContext = () => {}}: Props) {
    const setMessage = useContext(MessageContext)
    const notImplemented = () => setMessage('Oops, it look like I chose not to implement this feature :)')

    switch (type) {
        case 'playOnly':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext}/>
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
                    <PlayButtonLarge playContext={playContext}/>
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={notImplemented}/>
                </div>
            )
        default:
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext}/>
                    <LikeButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={notImplemented}/>
                </div>
            )
    }
}


function PlayButtonLarge({playContext}: {playContext: () => void}){
    const updatePlayer = useContext(PlayContext)
    return (
        <button className="playButton no-outline" title="Play" onClick={() => {
            playContext()
            setTimeout(() => updatePlayer(), 500)
        }}>
            <Icon name="Play" height='28' width='28'/>
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
