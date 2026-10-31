import React from 'react'

export default function CardInfo({title, description}: {title: string, description: string | null}) {
    return (
        <div className="CardInfo">
            <h3 title={title}>{title}</h3>
            <p>{description}</p>
        </div>
    )
}
