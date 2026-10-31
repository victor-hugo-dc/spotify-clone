import React from 'react'
import {useSearchParams} from 'react-router'
import QueryPage from './QueryPage'

// Search page that displays the search results for the query in the URL (?q=)
export default function SearchPage() {
    const [params] = useSearchParams()
    const query = params.get('q') ?? ''
    if (query === ''){
        return null
    }else{
        return (
            <QueryPage query={query}/>
        )
    }
}
