import React from 'react'
import {Link} from 'react-router'

// Spotify's own categories aren't open to this app (/browse is gone), so these are genre searches, in Spotify's colours.
const genres: [string, string][] = [
    ['Pop', '#8d67ab'], ['Hip-Hop', '#ba5d07'], ['Rock', '#006450'], ['Latin', '#e1118c'],
    ['Dance/Electronic', '#0d73ec'], ['Indie', '#e91429'], ['R&B', '#dc148c'], ['Jazz', '#477d95'],
    ['Country', '#d84000'], ['Classical', '#7d4b32'], ['Metal', '#1e3264'], ['K-Pop', '#148a08'],
    ['Soul', '#8c1932'], ['Folk & Acoustic', '#bc5900'], ['Punk', '#e13300'], ['Reggae', '#27856a'],
    ['Blues', '#283ea8'], ['Funk', '#af2896'],
]

// The search page before anything is typed: a tile per genre that searches for it.
export default function BrowseAll() {
    return (
        <section className='page-content browse-all' aria-label='Browse all'>
            <h2 className='search-heading'>Browse all</h2>
            <ul className='browse-grid'>
                {genres.map(([genre, color]) => (
                    <li key={genre}>
                        <Link to={`/search?${new URLSearchParams({q: genre})}`} className='browse-tile' style={{backgroundColor: color}}>{genre}</Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
