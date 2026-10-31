import React from 'react'
import type { IconProps } from '.'

export default function Pause({height, width}: IconProps) {
    return (
        <svg height={height} role="img" width={width} viewBox="0 0 24 24">
            <rect x="5" y="3" width="4.5" height="18" rx="1" fill="currentColor"></rect>
            <rect x="14.5" y="3" width="4.5" height="18" rx="1" fill="currentColor"></rect>
        </svg>
    )
}
