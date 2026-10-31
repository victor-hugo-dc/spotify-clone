import React from 'react'
import Icon, { type IconName } from '../icons'

type Props = {title: string, icon: IconName, size?: string, active?: boolean, extraClass?: string, disabled?: boolean, onClick?: () => void}

export default function ControlButton({title, icon, size, active, extraClass, disabled, onClick}: Props) {
    return (
        <button title={title} aria-label={title} aria-pressed={active} disabled={disabled} className={`control-button ${size ?? ''} ${active? 'active':''} ${extraClass ?? ''} no-outline`} onClick={onClick}>
            <Icon name={icon}/>
        </button>
    )
}
