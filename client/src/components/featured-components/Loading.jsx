import React from 'react'

export default function Loading({type}) {
    return (
        <div className='loading'>
            <div className={`loading-dots ${type === 'app' ? 'app' : ''}`} role='status' aria-label='Loading'>
                <span></span><span></span><span></span>
            </div>
        </div>
    )
}
