import React from 'react'

export default function ArtistRowTitle({title}: {title: string}) {
    return (
        <div className="ArtistRowTitle">
            <h2>{title}</h2>
        </div>
    )
}
