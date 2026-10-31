import React from 'react'
import PageTitle from './PageTitle'

// Shown instead of a page whose data couldn't be loaded, so nobody is left with a blank page or with buttons that act
// on nothing.
export default function LoadError({what, error}: {what: string, error: string}) {
    return (
        <div className='page-content' style={{paddingTop: '16px'}} role='alert'>
            <PageTitle name={`Couldn't load this ${what}`}/>
            <p className='empty-state'>{error}</p>
        </div>
    )
}
