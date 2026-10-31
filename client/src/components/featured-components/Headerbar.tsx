import React, { type ReactNode } from 'react'
import {useLocation} from 'react-router'

export default function Headerbar({children}: {children: ReactNode}) {
    const location = useLocation()

    return (
        <div className="header-bar" style={{background: location.pathname === '/'? undefined:'none'}}>
            {children}
        </div>
    )
}
