import React from 'react'
import Icon from '../icons'

export default function CardDisplay({url, type}: {url?: string, type: string}) {
    const radius = type === 'artist' ? '50%' : '0'
    return (
        <div className="CardDisplay" style={{borderRadius: radius}}>
            {url ?
                <img src={url} loading='lazy' className='previewImg' style={{borderRadius: radius}} alt=''></img> :
                // No artwork: a placeholder, like Spotify's, instead of an empty tile.
                <div className='previewImg card-placeholder' style={{borderRadius: radius}} aria-hidden='true'><Icon name='Music2'/></div>
            }
        </div>
    )
}
