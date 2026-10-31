import React, { useRef } from 'react'
import { useLocation, useNavigate, useNavigationType } from 'react-router'
import NavButton from './NavButton'

export default function HistoryNav() {
    const navigate = useNavigate()
    const type = useNavigationType()
    useLocation() // re-render on every navigation

    // React Router numbers this tab's history entries; a new page (PUSH) drops everything after it.
    const idx: number = window.history.state?.idx ?? 0
    const furthest = useRef(idx)
    furthest.current = type === 'PUSH' ? idx : Math.max(furthest.current, idx)

    return (
        <div className='HistoryNav'>
            <NavButton property='Back' disabled={idx === 0} onClick={() => navigate(-1)}/>
            <NavButton property='Forward' disabled={idx >= furthest.current} onClick={() => navigate(1)}/>
        </div>
    )
}
