import React, { type Ref } from 'react'
import PlayCard from './PlayCard'
import type { CardItem } from '../../utilities/types'

// `ref` goes to the last card, which loads the next page when it scrolls into view.
export default function RowGrid({playlists, ref}: {playlists: (CardItem | null)[], ref?: Ref<HTMLDivElement>}) {
    return (
        <div className="RowGrid">
            {playlists.map((playlist, index) => playlist &&
                <PlayCard key={playlist.id} ref={index === playlists.length - 1 ? ref : undefined} info={playlist}/>
            )}
        </div>
    )
}
