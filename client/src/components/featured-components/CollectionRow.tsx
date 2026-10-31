import React, { type Ref } from 'react'
import RowTitle from './RowTitle'
import RowGrid from './RowGrid'
import type { CardItem } from '../../utilities/types'

// A titled grid of cards. `oneRow` makes it a shelf, as on Home: one row of as many cards as fit (cards.css hides the
// rest, and shows 10 at most); `showAll` links its title, and a "Show all", to the page with all of them.
export default function CollectionRow({name, playlists, ref, oneRow = false, showAll}: {name: string, playlists: CardItem[], ref?: Ref<HTMLDivElement>, oneRow?: boolean, showAll?: string}) {
    return (
        <div className={oneRow ? 'CollectionRow shelf' : 'CollectionRow'}>
            <RowTitle title={name} to={showAll}/>
            <RowGrid ref={ref} playlists={oneRow ? playlists.slice(0, 10) : playlists}/>
        </div>
    )
}
