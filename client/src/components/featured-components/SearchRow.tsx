import React from 'react'

import SearchRowTitle from './SearchRowTitle'
import SearchRowGrid from './SearchRowGrid'
import type { CardItem } from '../../utilities/types'

export default function SearchRow({title, items}: {title: string, items: CardItem[]}) {
    return (
        <div className='CollectionRow' style={{display: items.length===0? 'none':'grid'}}>
            <SearchRowTitle title={title}/>
            <SearchRowGrid info={items}/>
        </div>
    )
}
