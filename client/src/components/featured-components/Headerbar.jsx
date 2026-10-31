import React from 'react'
import {useLocation} from 'react-router'

export default function Headerbar({children}) {
    const location = useLocation()

    return (
        <div className="header-bar" style={{background: location.pathname === '/'? null:'none'}}>
            {children}
        </div>
    )
}
