import React, { type CSSProperties } from 'react'

export default function PageTitle({name}: {name: string}) {
    return (
        <div className='PageTitle'>
            <h1 style={style}>{name}</h1>
        </div>
    )
}

const style: CSSProperties = {
    fontSize: '24px',
    fontWeight: '700',
    lineHeight: '28px',
    letterSpacing: '-.04em',
    textTransform: 'none',
    color: '#fff'
}