import React, {useContext} from 'react'
import Icon from '../icons'
import {PlayContext} from '../../utilities/context'

export default function PlayListFunctions({type, follow, onFollow, setMessage, playContext}) {
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
                    <MoreButton onClick={() => setMessage('Oops, it look like I chose not to implement this feature :)')}/>
                </div>
            )
        case 'user':
            return (
                <div className="playListFunctions">
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={() => setMessage('Oops, it look like I chose not to implement this feature :)')}/>
                </div>
                    
            )
        case 'artist':
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext}/>
                    <FollowButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={() => setMessage('Oops, it look like I chose not to implement this feature :)')}/>
                </div>
            )
        default:
            return (
                <div className="playListFunctions">
                    <PlayButtonLarge playContext={playContext}/>
                    <LikeButton follow={follow} onFollow={onFollow}/>
                    <MoreButton onClick={() => setMessage('Oops, it look like I chose not to implement this feature :)')}/>
                </div>
            )
    }
}


function PlayButtonLarge({playContext}){
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

function LikeButton({follow, onFollow}){
    return (
        <button className={`likeButton ${follow? 'noHover':''} no-outline`} style={{color: follow? 'var(--spotify-green)':null}} title={follow? 'Remove from Library':"Save to Your Library"} onClick={onFollow}>
            <Icon name='Heart' fill={follow}/>
        </button>
    )
}

function FollowButton({follow, onFollow}){
    return (
        <button className="followButton no-outline" onClick={onFollow}>{follow? 'following':'follow'}</button>
    )
}

function MoreButton({onClick}){
    return (
        <button className="moreButton no-outline" title="More" onClick={onClick}>• • •</button>
    )
}
