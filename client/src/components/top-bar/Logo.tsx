import React from 'react'
import { Link } from 'react-router'

// Spotify's round mark (the wordmark's first glyph), linking home.
export default function Logo() {
    return (
        <Link to="/" className="logo-link no-outline" aria-label="Spotify" title="Spotify">
            <svg viewBox="8 4 336 336" className="spotify-logo" aria-hidden="true">
                <path fill="currentColor" d="M8 171c0 92 76 168 168 168s168-76 168-168S268 4 176 4 8 79 8 171zm230 78c-39-24-89-30-147-17-14 2-16-18-4-20 64-15 118-8 162 19 11 7 0 24-11 18zm17-45c-45-28-114-36-167-20-17 5-23-21-7-25 61-18 136-9 188 23 14 9 0 31-14 22zM80 133c-17 6-28-23-9-30 59-18 159-15 221 22 17 9 1 37-17 27-54-32-144-35-195-19z"></path>
            </svg>
        </Link>
    )
}
