import React from 'react'
import PlayCard from './PlayCard'
import type { CardItem } from '../../utilities/types'

// One row of cards, as many as fit (search.css hides the rest), or with `wrap` every card, row after row.
export default function SearchRowGrid({info, wrap = false}: {info: CardItem[], wrap?: boolean}) {
    return (
        <div className={`search-cards${wrap ? ' wrap' : ''}`}>
            {info.map((item) => <PlayCard key={item.id} info={item}/>)}
        </div>
    )
}
