import React from 'react'
import {Link} from 'react-router'
import Icon from '../icons'

import useLibrary from '../../utilities/hooks/useLibrary';

// Fits both a Web API track and the Web Playback SDK's current_track, which has URIs but no album or artist ids.
export type PlayInfo = {
    id: string | null,
    uri: string,
    name: string,
    album: {uri: string, images: {url: string}[]},
    artists: {uri: string, name: string}[],
}

const idOf = (uri: string) => uri.split(':').pop()

export default function NowPlaying({playInfo}: {playInfo: PlayInfo | null}) {
    const [liked, toggleLiked] = useLibrary(playInfo?.uri ?? '', 'Liked Songs')

    if (!playInfo) {
        return (<></>);
    }
    const {album, artists, name, id} = playInfo

    const imageUrl = album.images?.[album.images.length - 1]?.url

    return (
        <div className="now-playing">

            <div className="player-cover">
                {imageUrl ? 
                    <img draggable="false" loading="eager" src={imageUrl} alt=""></img>
                    :
                    <div>
                        <Icon name='Music2'/>
                    </div>
                }
            </div>

            <div className="player-info" style={{display: name === ''? 'none':undefined}}>

                <div className="player-info-track ellipsis-one-line">
                    <Link to={`/album/${idOf(album.uri)}?highlight=${id}`}>{name}</Link>
                </div>

                <div className="player-info-artist ellipsis-one-line">
                    {artists.map((artist, index) => {  
                        return <Link to={`/artist/${idOf(artist.uri)}`} key={index}>{artist.name}</Link>
                    })} 
                </div>

            </div>

            <div className="player-like" style={{display: name === ''? 'none':undefined}}>
                <button title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'} aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'} aria-pressed={liked} className={`player-like-button no-outline ${liked ? 'liked' : ''}`} onClick={toggleLiked}>
                    <Icon name='Heart' fill={liked} />
                </button>
            </div>
        
        </div>
    )
}
