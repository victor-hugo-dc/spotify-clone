import React from 'react'
import PlayCard from './PlayCard'
import type { CardItem } from '../../utilities/types'

export default function SearchRowGrid({info}: {info: CardItem[]}) {
    return (
        <div className="RowGrid">
            {info.map((item) => {
                return <PlayCard key={item.id} info={item}/> 
            })}
        </div>
    )
}
