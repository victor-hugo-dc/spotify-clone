import React, { useEffect, useRef, useState } from 'react'

export type MenuItem = { label: string, onSelect: () => void }

// Copy-link and open-in-app entries for anything with a spotify: URI.
export function shareItems(uri: string, noun: string, setMessage: (message: string) => void): MenuItem[] {
    const url = `https://open.spotify.com/${uri.split(':').slice(1).join('/')}`
    return [
        {label: `Copy link to ${noun}`, onSelect: () => {
            navigator.clipboard.writeText(url).then(() => setMessage('Link copied to clipboard'), () => setMessage(`Couldn't copy the link: ${url}`))
        }},
        {label: 'Open in Spotify app', onSelect: () => { window.location.href = uri }},
    ]
}

// The "• • •" button and its menu. Escape or a click elsewhere closes it; Up, Down, Home and End move between its items.
export default function MoreMenu({items, label}: {items: MenuItem[], label: string}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    // Closing by Escape or a choice gives focus back to the button; it would otherwise be lost with the menu.
    const button = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key !== 'Escape' : ref.current?.contains(e.target as Node)) return
            if (e instanceof KeyboardEvent && ref.current?.contains(document.activeElement)) button.current?.focus()
            setOpen(false)
        }
        ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    // Screen readers move through a menu with the arrow keys, not Tab; Up and Down wrap round.
    const move = (e: React.KeyboardEvent<HTMLUListElement>) => {
        const options = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=menuitem]')]
        const at = options.indexOf(e.target as HTMLElement)
        const to = ({ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: -1} as Record<string, number>)[e.key]
        if (to === undefined) return
        e.preventDefault()
        options.at(to % options.length)?.focus()
    }

    return (
        <div className='moreMenu' ref={ref}>
            <button ref={button} className="moreButton no-outline" title={`More options for ${label}`} aria-label={`More options for ${label}`} aria-haspopup='menu' aria-expanded={open} onClick={() => setOpen(!open)}>• • •</button>
            {open &&
                <ul className='contextMenu' role='menu' aria-label={label} onKeyDown={move}>
                    {items.map((item) => (
                        <li key={item.label} role='none'>
                            <button role='menuitem' onClick={() => { button.current?.focus(); setOpen(false); item.onSelect() }}>{item.label}</button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}
