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

// The "• • •" button and its menu. Escape or a click elsewhere closes it.
export default function MoreMenu({items, label}: {items: MenuItem[], label: string}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false)
        }
        ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus()
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    return (
        <div className='moreMenu' ref={ref}>
            <button className="moreButton no-outline" title={`More options for ${label}`} aria-label={`More options for ${label}`} aria-haspopup='menu' aria-expanded={open} onClick={() => setOpen(!open)}>• • •</button>
            {open &&
                <ul className='contextMenu' role='menu' aria-label={label}>
                    {items.map((item) => (
                        <li key={item.label} role='none'>
                            <button role='menuitem' onClick={() => { setOpen(false); item.onSelect() }}>{item.label}</button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}
