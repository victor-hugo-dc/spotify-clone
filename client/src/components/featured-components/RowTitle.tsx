import React from 'react'
import { Link } from 'react-router'

// `to`: the page with everything in the row, which the title and "Show all" link to.
export default function RowTitle({title, to}: {title: string, to?: string}) {
    return (
        <div className="RowTitle">
            <h2>{to ? <Link to={to}>{title}</Link> : title}</h2>
            {to && <Link className='show-all' to={to} aria-label={`Show all ${title}`}>Show all</Link>}
        </div>
    )
}
