import React, {useContext, type Ref} from 'react'
import {useNavigate, Link} from 'react-router'

import CardInfo from './CardInfo'
import CardDisplay from './CardDisplay'
import Icon from '../icons'

import { spotify } from '../../utilities/spotify'
import {TokenContext, PlayContext, MessageContext} from '../../utilities/context'
import type { CardItem } from '../../utilities/types'

export default function PlayCard({info, ref}: {info: CardItem, ref?: Ref<HTMLDivElement>}) {
    const navigate = useNavigate()
    const description = returnDescription(info)
    const setMessage = useContext(MessageContext)

    const token = useContext(TokenContext)
    const updatePlayer = useContext(PlayContext)

    const images = info.type === 'track' ? info.album?.images : info.images
    const image_url = images?.[0]?.url
    const to = info.type === 'link' ? info.to : info.type === 'track' ? `/album/${info.album?.id}?highlight=${info.id}` : `/${info.type}/${info.id}`

    const playContext = () => {
        if (info.type === 'link'){
            navigate(info.to)
            return
        }
        const body = info.type === 'track' ? {uris: [info.uri]} : {context_uri: info.uri}
        spotify('/me/player/play', token, {method: 'PUT', body})
            .then(() => setTimeout(() => updatePlayer(), 1000))
            .catch(error => setMessage(`ERROR: ${error.message}`))
    }

    return (
        <div className='pcWrapper'>
            <Link to={to} style={{textDecoration:'none', color:'var(--main-text)', zIndex:'3'}}>
                <div ref={ref} className="PlayCard">
                    <CardDisplay url={image_url} type={info.type}/>
                    <CardInfo title={info.name} description={description}/>
                </div>
            </Link>
            <button className="smallButton no-outline" title="Play" onClick={() => {
                playContext()
                updatePlayer()
            }}>
                <Icon name="Play" height='17' width='17'/>
            </button>
        </div>
    )
}


function returnDescription(info: CardItem){
    switch (info.type){
        case 'playlist':
           return info.description || `By ${info.owner.display_name}`
        case 'album':
        case 'track':
            return info.artists.map((object) => object.name).join(', ')
        case 'artist':
            return 'artist'
        case 'link':
            return info.description
    }
}
