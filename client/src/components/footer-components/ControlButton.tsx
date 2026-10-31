import React from 'react'
import Icon, { type IconName } from '../icons'

type Props = {title: string, icon: IconName, size?: string, active?: boolean, expanded?: boolean, extraClass?: string, disabled?: boolean, onClick?: () => void}

// A button that opens a popup passes `expanded`: it says whether that's open, and `active` then only colours it.
export default function ControlButton({title, icon, size, active, expanded, extraClass, disabled, onClick}: Props) {
    return (
        <button title={title} aria-label={title} aria-pressed={expanded === undefined ? active : undefined} aria-expanded={expanded} disabled={disabled} className={`control-button ${size ?? ''} ${active? 'active':''} ${extraClass ?? ''} no-outline`} onClick={onClick}>
            <Icon name={icon}/>
        </button>
    )
}
