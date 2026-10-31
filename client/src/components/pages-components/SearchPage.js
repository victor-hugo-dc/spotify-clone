import React from 'react'
import QueryPage from './QueryPage'

// Search page that displays the search results for a search
export default function SearchPage({query}) {
    if (query === ''){
        return null
    }else{
        return (
            <QueryPage query={query}/>
        )
    }
}
