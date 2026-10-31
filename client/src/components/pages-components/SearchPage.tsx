import React from 'react'
import QueryPage from './QueryPage'

// Search page that displays the search results for a search
export default function SearchPage({query}: {query: string}) {
    if (query === ''){
        return null
    }else{
        return (
            <QueryPage query={query}/>
        )
    }
}
