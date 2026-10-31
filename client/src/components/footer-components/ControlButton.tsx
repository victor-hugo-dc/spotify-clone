import React from 'react'
import Icon, { type IconName } from '../icons'

type Props = {title: string, icon: IconName, size?: string, active?: boolean, extraClass?: string, onClick?: () => void}

export default function ControlButton({title, icon, size, active, extraClass, onClick}: Props) {
    return (
        <button title={title} className={`control-button ${size ?? ''} ${active? 'active':''} ${extraClass ?? ''} no-outline`} onClick={onClick}>
            <Icon name={icon}/>
        </button>
    )
}
