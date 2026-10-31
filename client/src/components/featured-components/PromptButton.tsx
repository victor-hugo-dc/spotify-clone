import React, { type CSSProperties } from 'react'

const styles: Record<'dark' | 'light', CSSProperties> = {
    dark: {
        backgroundColor: 'transparent',
        color: '#fff'
    },
    light: {
        backgroundColor: '#fff',
        color: '#181818'
    },
}

type Props = {to?: string, name: string, styleName: 'dark' | 'light', onClick?: () => void}

export default function PromptButton({to, name, styleName, onClick}: Props) {
    return (
        // A link that looks like a button (a <button> inside an <a> is two controls in one).
        to?
        <a href={to} className="PromptButton no-outline" style={styles[styleName]}>{name}</a>
            :
        <button className="PromptButton no-outline" name={name} style={styles[styleName]} onClick={onClick}>{name}</button>
    )
}
