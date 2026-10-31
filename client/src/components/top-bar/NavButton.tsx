import React from 'react'
import Icon from '../icons'

type Props = {property: 'Back' | 'Forward', disabled: boolean, onClick: () => void}

export default function NavButton({property, disabled, onClick}: Props) {
    return (
        <button className='navButton no-outline' title={`Go ${property.toLowerCase()}`} aria-label={`Go ${property.toLowerCase()}`} disabled={disabled} onClick={onClick}> 
            <Icon name={property} />
        </button>
    )
}
