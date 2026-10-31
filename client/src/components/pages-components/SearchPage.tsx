import React from 'react'
import {useSearchParams} from 'react-router'
import QueryPage from './QueryPage'
import BrowseAll from '../search/BrowseAll'
import '../../styles/search.css'

// The search page: Browse all until something is typed in the top bar's box, which puts it in the URL (?q=).
export default function SearchPage() {
    const [params] = useSearchParams()
    const query = params.get('q') ?? ''
    return query.trim() === '' ? <BrowseAll/> : <QueryPage query={query}/>
}
