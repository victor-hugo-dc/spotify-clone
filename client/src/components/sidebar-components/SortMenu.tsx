import React, { useEffect, useRef, useState } from 'react'
import Icon from '../icons'
import type { Sort } from './library'

const sorts: [Sort, string][] = [['recents', 'Recents'], ['added', 'Recently Added'], ['alphabetical', 'Alphabetical'], ['creator', 'Creator']]

// "Recents ☰": how Your Library is sorted. Like the "• • •" menus: Escape, Tab or a click elsewhere closes it, Escape
// or a choice gives focus back to the button, and Up, Down, Home and End move between the options.
export default function SortMenu({sort, onSort}: {sort: Sort, onSort: (sort: Sort) => void}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const button = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return
        const close = (e: MouseEvent | KeyboardEvent) => {
            if (e instanceof KeyboardEvent ? e.key !== 'Escape' && e.key !== 'Tab' : ref.current?.contains(e.target as Node)) return
            // Tab moves focus on by itself, from where the menu was.
            if (e instanceof KeyboardEvent && e.key === 'Escape' && ref.current?.contains(document.activeElement)) button.current?.focus()
            setOpen(false)
        }
        ref.current?.querySelector<HTMLButtonElement>('[aria-checked=true]')?.focus()
        document.addEventListener('mousedown', close)
        document.addEventListener('keydown', close)
        return () => {
            document.removeEventListener('mousedown', close)
            document.removeEventListener('keydown', close)
        }
    }, [open])

    const move = (e: React.KeyboardEvent<HTMLUListElement>) => {
        const options = [...e.currentTarget.querySelectorAll<HTMLElement>('[role=menuitemradio]')]
        const at = options.indexOf(e.target as HTMLElement)
        const to = ({ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: -1} as Record<string, number>)[e.key]
        if (to === undefined) return
        e.preventDefault()
        options.at(to % options.length)?.focus()
    }

    return (
        <div className='library-sort' ref={ref}>
            <button ref={button} className='library-sort-button no-outline' title='Sort by' aria-haspopup='menu' aria-expanded={open} onClick={() => setOpen(!open)}>
                {sorts.find(([value]) => value === sort)?.[1]}
                <Icon name='List' width='16' height='16'/>
            </button>
            {open &&
                <ul className='library-sort-menu' role='menu' aria-label='Sort by' onKeyDown={move}>
                    <li className='library-sort-heading' aria-hidden='true'>Sort by</li>
                    {sorts.map(([value, label]) => (
                        <li key={value} role='none'>
                            <button role='menuitemradio' aria-checked={value === sort} onClick={() => { button.current?.focus(); setOpen(false); onSort(value) }}>
                                {label}
                                {value === sort && <Icon name='Saved' width='16' height='16'/>}
                            </button>
                        </li>
                    ))}
                </ul>
            }
        </div>
    )
}
