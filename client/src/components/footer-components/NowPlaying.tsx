import React from 'react'
import {Link} from 'react-router'
import Icon from '../icons'

import useLiked from '../../utilities/hooks/useLiked';

// Fits both a Web API track and the Web Playback SDK's current_track, which has URIs but no album or artist ids.
// Local files and podcast episodes have no album or artist URIs, and episodes from the Web API no album at all.
export type PlayInfo = {
    id: string | null,
    uri: string,
    name: string,
    album?: {uri: string | null, name?: string, images: {url: string}[]},
    artists?: {uri: string | null, name: string}[],
}

// The app's page for a spotify:album:… or spotify:artist:… URI; nothing for local files or episodes.
const pageOf = (uri: string | null | undefined, kind: 'album' | 'artist') =>
    uri?.startsWith(`spotify:${kind}:`) ? `/${kind}/${uri.split(':').pop()}` : null

export default function NowPlaying({playInfo}: {playInfo: PlayInfo | null}) {
    // Local files can't be saved to Liked Songs.
    const savable = !!playInfo?.uri && !playInfo.uri.startsWith('spotify:local:')
    const [liked, toggleLiked] = useLiked(savable ? playInfo.uri : '')

    if (!playInfo) {
        return (<></>);
    }
    const {album, artists = [], name, id} = playInfo

    const imageUrl = album?.images.at(-1)?.url
    const albumPage = pageOf(album?.uri, 'album')

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
                    {albumPage ? <Link to={`${albumPage}?highlight=${id}`}>{name}</Link> : name}
                </div>

                <div className="player-info-artist ellipsis-one-line">
                    {artists.map((artist, index) => {
                        const page = pageOf(artist.uri, 'artist')
                        return page ? <Link to={page} key={index}>{artist.name}</Link> : <span key={index}>{artist.name}</span>
                    })}
                </div>

            </div>

            {name !== '' && savable &&
                <button title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'} aria-label={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'} aria-pressed={liked} className={`player-like-button no-outline ${liked ? 'liked' : ''}`} onClick={toggleLiked}>
                    <Icon name={liked ? 'Saved' : 'AddCircle'} width='16' height='16' />
                </button>
            }

        </div>
    )
}
