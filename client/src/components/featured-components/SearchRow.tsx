import React from 'react'

import SearchRowGrid from './SearchRowGrid'
import type { CardItem } from '../../utilities/types'

// A shelf of search results: its title over one row of cards (its chip at the top shows them all).
export default function SearchRow({title, items}: {title: string, items: CardItem[]}) {
    if (items.length === 0) return null
    return (
        <section className='search-shelf' aria-label={title}>
            <h2 className='search-heading'>{title}</h2>
            <SearchRowGrid info={items}/>
        </section>
    )
}
