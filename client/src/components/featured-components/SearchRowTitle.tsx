import React from 'react'

export default function SearchRowTitle({title}: {title: string}) {
    return (
        <div className="RowTitle">
            <h1 style={{fontSize:'24px',
                        lineHeight:'28px',
                        letterSpacing: '-0.04em',
                        fontWeight: '700',
                        color:'white'}}>{title}</h1>
        </div>
    )
}