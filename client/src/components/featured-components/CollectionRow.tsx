import React, { type Ref } from 'react'
import RowTitle from './RowTitle'
import RowGrid from './RowGrid'
import type { CardItem } from '../../utilities/types'


export default function CollectionRow({name, playlists, ref}: {name: string, playlists: CardItem[], ref?: Ref<HTMLDivElement>}) {
    return (
        <div className="CollectionRow">
            <RowTitle title={name}/>
            <RowGrid ref={ref} playlists={playlists}/>
        </div>
    )
}
