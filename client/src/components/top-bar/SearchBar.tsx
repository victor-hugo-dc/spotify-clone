import React, {useEffect, useRef, useState} from 'react'
import {Link, useMatch, useNavigate, useSearchParams} from 'react-router'
import Icon from '../icons'

// The query lives in the URL (/search?q=...), so Back from a result, a reload or a shared link keeps it. Typing on any
// other page opens the search page (Back returns there); on it, typing replaces the history entry instead of adding one
// per keystroke.
export default function SearchBar() {
    const navigate = useNavigate()
    const onSearch = useMatch('/search') !== null
    const [params] = useSearchParams()
    const q = onSearch ? params.get('q') ?? '' : ''
    // What's typed lives here, so the caret stays where you type while the URL catches up (navigations are async).
    const [text, setText] = useState(q)
    const input = useRef<HTMLInputElement>(null)

    // Follow the URL when it changes while you're not typing (Back, Browse, or leaving the search page).
    useEffect(() => {
        if (document.activeElement !== input.current) setText(q)
    }, [q])

    return (
        <div className='SearchBar' role='search'>
            <span className='SearchIcon' aria-hidden='true'>
                <Icon name="N-Search" />
            </span>
            <input className= 'SearchInput no-outline'
                    maxLength={80}
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck='false'
                    placeholder='What do you want to play?'
                    aria-label='What do you want to play?'
                    ref={input}
                    value={text}
                    onChange={e => {
                        setText(e.target.value)
                        // The live URL, not this render's: a fast second keystroke can come before the first one's page renders.
                        navigate(e.target.value ? `/search?${new URLSearchParams({q: e.target.value})}` : '/search', {replace: window.location.pathname === '/search'})
                    }}/>
            <Link to='/search' className='SearchBrowse no-outline' aria-label='Browse' title='Browse'>
                <Icon name='Browse' />
            </Link>
        </div>
    )
}
