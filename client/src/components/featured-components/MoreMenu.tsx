import React, { useEffect, useRef, useState, type ReactNode } from 'react'
import Icon from '../icons'

// `checked` makes the item one of a set of choices (List or Compact), showing which is on.
export type MenuItem = { label: string, onSelect: () => void, checked?: boolean }

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

type Props = {
    items: MenuItem[],
    // The menu's name; the button is "More options for {label}" unless `title` names it.
    label: string,
    title?: string,
    className?: string,
    // What the button shows: the "…" icon unless given.
    children?: ReactNode,
}

const ITEM = '[role^=menuitem]'

// The "…" button and its menu. Escape, Tab or a click elsewhere closes it; Up, Down, Home and End move between its items.
export default function MoreMenu({items, label, title = `More options for ${label}`, className = '', children = <Icon name='More'/>}: Props) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    // Closing by Escape or a choice gives focus back to the button; it would otherwise be lost with the menu.
    const button = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key !== 'Escape' && e.key !== 'Tab' : ref.current?.contains(e.target as Node)) return
            // Tab moves focus on by itself, from where the menu was.
            if (e instanceof KeyboardEvent && e.key === 'Escape' && ref.current?.contains(document.activeElement)) button.current?.focus()
            setOpen(false)
        }
        ref.current?.querySelector<HTMLButtonElement>(ITEM)?.focus()
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    // Screen readers move through a menu with the arrow keys, not Tab; Up and Down wrap round.
    const move = (e: React.KeyboardEvent<HTMLUListElement>) => {
        const options = [...e.currentTarget.querySelectorAll<HTMLElement>(ITEM)]
        const at = options.indexOf(e.target as HTMLElement)
        const to = ({ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: -1} as Record<string, number>)[e.key]
        if (to === undefined) return
        e.preventDefault()
        options.at(to % options.length)?.focus()
    }

    return (
        <div className={`moreMenu ${className}`} ref={ref}>
            <button ref={button} className="moreButton no-outline" title={title} aria-label={title} aria-haspopup='menu' aria-expanded={open} onClick={() => setOpen(!open)}>{children}</button>
            {open &&
                <ul className='contextMenu' role='menu' aria-label={label} onKeyDown={move}>
                    {items.map((item) => (
                        <li key={item.label} role='none'>
                            <button role={item.checked === undefined ? 'menuitem' : 'menuitemradio'} aria-checked={item.checked} onClick={() => { button.current?.focus(); setOpen(false); item.onSelect() }}>{item.label}</button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}
