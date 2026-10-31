import React from 'react'

export default function CardInfo({title, description}: {title: string, description: string | null}) {
    return (
        <div className="CardInfo">
            <h2>{title}</h2>
            <p>{description}</p>
        </div>
    )
}
