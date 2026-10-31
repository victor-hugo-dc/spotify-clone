import React, { useContext, useState } from 'react'
import { Link } from 'react-router'

import Icon from '../icons'
import type { Context } from './recent'
import usePlayback from '../../utilities/hooks/usePlayback'
import useCoverColor from '../../utilities/hooks/useCoverColor'
import { MessageContext, UserContext } from '../../utilities/context'
import { spotify } from '../../utilities/spotify'
import type { LinkCard, Paging, Track } from '../../utilities/types'

type Item = LinkCard | Context
type TileProps = { item: Item, onHover: (cover: string) => void }

// Home's shortcut grid (a URI is a context still on its way: a grey tile). Behind the top of the page, a wash of the
// colour of the cover you point at, or of the first one, as on Spotify.
export default function Shortcuts({items}: {items: (Item | string)[]}) {
    const [hovered, setHovered] = useState<string>()
    const first = items[0]
    const wash = useCoverColor(hovered ?? (typeof first === 'object' ? first.images?.[0]?.url : undefined))

    return (
        <>
            <div className='home-wash' style={wash ? {backgroundColor: wash} : undefined}/>
            <div className='shortcuts' onMouseLeave={() => setHovered(undefined)}>
                {items.map((item) =>
                    typeof item === 'string' ? <div key={item} className='shortcut'/> :
                    item.type === 'link' ? <LikedTile key={item.id} item={item} onHover={setHovered}/> :
                    <ContextTile key={item.uri} item={item} onHover={setHovered}/>
                )}
            </div>
        </>
    )
}

function ContextTile({item, onHover}: TileProps & {item: Context}) {
    const {isPlaying, toggle} = usePlayback()
    return <Tile item={item} onHover={onHover} playing={isPlaying(item.uri)} onPlay={() => toggle(item.uri, {context_uri: item.uri})}/>
}

// The list of songs the Liked Songs tile last started, so it can still pause it after you come back Home.
let likedStarted: string[] = []

// Liked Songs has no context to play: like its page, the tile plays your 50 latest liked songs as a list.
// shortcut: a list started from the Liked Songs page shows as not playing here until this tile starts one; share the
// started list through usePlayback if that matters.
function LikedTile({item, onHover}: TileProps) {
    const user = useContext(UserContext)
    const setMessage = useContext(MessageContext)
    const {nowPlaying, isPlaying, isStarted, toggle} = usePlayback()
    // As on its page: the list started here, or your collection, which Spotify's own apps play.
    const uri = likedStarted.length > 0 && isStarted(likedStarted) ? nowPlaying.trackUri ?? '' : user ? `spotify:user:${user.id}:collection` : ''
    const loaded = uri !== '' && (uri === nowPlaying.contextUri || uri === nowPlaying.trackUri)

    const play = () => {
        if (loaded) return toggle(uri, {})
        spotify<Paging<{track: Track}>>('/me/tracks?limit=50')
            .then(({items}) => {
                likedStarted = items.map(({track}) => track.uri)
                if (likedStarted.length > 0) toggle('', {uris: likedStarted})
                else setMessage('Songs you like will appear in Liked Songs')
            })
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return <Tile item={item} onHover={onHover} playing={isPlaying(uri)} onPlay={play}/>
}

function Tile({item, onHover, playing, onPlay}: TileProps & {playing: boolean, onPlay: () => void}) {
    const cover = item.images?.[0]?.url
    return (
        <div className={playing ? 'shortcut playing' : 'shortcut'} onMouseEnter={() => onHover(cover ?? '')}>
            <Link className='shortcut-link' to={item.type === 'link' ? item.to : `/${item.type}/${item.id}`}>
                {cover ?
                    <img className='shortcut-cover' src={cover} alt=''/> :
                    <span className='shortcut-cover card-placeholder' aria-hidden='true'><Icon name='Music2'/></span>
                }
                <span className='shortcut-name'>{item.name}</span>
            </Link>
            <button className='shortcut-play no-outline' title={playing ? 'Pause' : 'Play'} aria-label={`${playing ? 'Pause' : 'Play'} ${item.name}`} onClick={onPlay}>
                <Icon name={playing ? 'Pause' : 'Play'} height='16' width='16'/>
            </button>
        </div>
    )
}
