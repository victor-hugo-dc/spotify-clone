import React, { useState } from 'react';
import {useMatch} from 'react-router'

import Headerbar from './Headerbar'
import PageContent, { type PageContentProps } from './PageContent'

import HistoryNav from './HistoryNav'
import SearchBar from './SearchBar'
import UserInfo from './UserInfo'
import CollectionNav from './CollectionNav'


// top bar that features additional information for a sidebar page
function Featured (props: Omit<PageContentProps, 'query'>){
    const [query, setQuery] = useState('')
    const onSearch = useMatch('/search')
    const onCollection = useMatch('/collection/*')

    const resetQuery = ()=>{
        setQuery('')
    }

    return (
        <div className='featured'>
            <Headerbar>
                <HistoryNav />

                {onSearch && <SearchBar query={query} setQuery={setQuery} resetQuery={resetQuery}/>}

                {onCollection && <CollectionNav/>}

                <UserInfo />

            </Headerbar>

            <PageContent query={query} {...props}/>
        </div>
    );
}

export default Featured;
