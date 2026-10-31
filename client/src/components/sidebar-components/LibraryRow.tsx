import React, { useId } from 'react'
import { NavLink } from 'react-router'
import Icon from '../icons'

type Props = {to: string, name: string, subtitle: string, image?: string, round?: boolean, pinned?: boolean, loaded: boolean, playing: boolean}

// A row of Your Library: a link to the item's page, named by its title and described by the line under it. The page
// you're on gets a lighter background (NavLink's `active`); what the player has loaded gets a green title, and a
// speaker while it plays.
export default function LibraryRow({to, name, subtitle, image, round, pinned, loaded, playing}: Props) {
    const id = useId()
    const cover = `library-cover${round ? ' round' : ''}`
    return (
        <li>
            <NavLink to={to} className={`library-row no-outline${loaded ? ' loaded' : ''}`} aria-labelledby={`${id}name`}
                     aria-describedby={playing ? `${id}sub ${id}playing` : `${id}sub`}>
                {image ?
                    <img className={cover} src={image} alt='' loading='lazy'/> :
                    <span className={cover}><Icon name='Music'/></span>
                }
                <span className='library-row-text'>
                    <span id={`${id}name`} className='library-row-name'>{name}</span>
                    <span id={`${id}sub`} className='library-row-subtitle'>
                        {pinned && <span className='library-pin' role='img' aria-label='Pinned'><Icon name='Pin' width='12' height='12'/></span>}
                        {subtitle}
                    </span>
                </span>
                {playing &&
                    <span id={`${id}playing`} className='library-playing' role='img' aria-label='Playing'>
                        <Icon name='VolumePlaying' width='16' height='16'/>
                    </span>
                }
            </NavLink>
        </li>
    )
}
