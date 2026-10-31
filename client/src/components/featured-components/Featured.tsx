import React from 'react';
import {useMatch} from 'react-router'

import Headerbar from './Headerbar'
import PageContent, { type PageContentProps } from './PageContent'

import HistoryNav from './HistoryNav'
import SearchBar from './SearchBar'
import UserInfo from './UserInfo'
import CollectionNav from './CollectionNav'


// top bar that features additional information for a sidebar page
function Featured (props: PageContentProps){
    const onSearch = useMatch('/search')
    const onCollection = useMatch('/collection/*')

    return (
        <div className='featured'>
            <Headerbar>
                <HistoryNav />

                {onSearch && <SearchBar/>}

                {onCollection && <CollectionNav/>}

                <UserInfo />

            </Headerbar>

            <PageContent {...props}/>
        </div>
    );
}

export default Featured;
