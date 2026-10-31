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
        to? 
        <a href={to}>
            <button className="PromptButton no-outline" name={name} style={styles[styleName]} >{name}</button>
        </a>
            :
        <button className="PromptButton no-outline" name={name} style={styles[styleName]} onClick={onClick}>{name}</button>
    )
}
