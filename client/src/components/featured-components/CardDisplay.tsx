import React from 'react'
import Icon from '../icons'

export default function CardDisplay({url, type}: {url?: string, type: string}) {
    return (
        <div className={type === 'artist' ? 'CardDisplay round' : 'CardDisplay'}>
            {url ?
                <img src={url} loading='lazy' className='previewImg' alt=''></img> :
                // No artwork: a placeholder, like Spotify's, instead of an empty tile.
                <div className='previewImg card-placeholder' aria-hidden='true'><Icon name='Music2'/></div>
            }
        </div>
    )
}
