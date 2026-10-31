import React from 'react'
import '../../styles/pages.css'

// The title of Shoutify's own pages and of the error pages.
export default function PageTitle({name}: {name: string}) {
    return <h1 className='page-title'>{name}</h1>
}
