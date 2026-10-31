import React, {useEffect, useRef, useState, type CSSProperties} from 'react'
import {useSearchParams} from 'react-router'
import Icon from '../icons'

// The query lives in the URL (/search?q=...), so Back from a result, a reload or a shared link keeps it. Typing replaces
// the history entry instead of adding one per keystroke.
export default function SearchBar() {
    const [params, setParams] = useSearchParams()
    const q = params.get('q') ?? ''
    // What's typed lives here, so the caret stays where you type while the URL catches up (navigations are async).
    const [text, setText] = useState(q)
    const input = useRef<HTMLInputElement>(null)

    // Follow the URL when it changes while you're not typing (Back, or the Search link).
    useEffect(() => {
        if (document.activeElement !== input.current) setText(q)
    }, [q])

    return (
        <div className="SearchContainer">
            <div className='SearchBar'>
                <div style={iconStyle}>
                    <Icon name="N-Search" /> 
                </div>
                <input className= 'SearchInput no-outline' 
                        maxLength={80} 
                        autoCorrect='off' 
                        autoCapitalize='off' 
                        spellCheck='false'
                        autoFocus={true}
                        placeholder='Search for Artists, Songs, or Podcasts'
                        ref={input}
                        value={text}
                        onChange={e => {
                            setText(e.target.value)
                            setParams(e.target.value ? {q: e.target.value} : {}, {replace: true})
                        }}/>
            </div>
        </div>
    )
}


const iconStyle: CSSProperties = {
    position:'absolute',
    top: '0',
    bottom: '0',
    left: '12px',
    display: 'flex',
    alignItems: 'center',
    cursor:'text'
}

