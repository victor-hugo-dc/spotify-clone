import React, { useState } from 'react'

// Lyrics are switched off for now (Spotify's Web API has no lyrics endpoint),
// so the line to annotate is typed in instead of selected from the lyrics.
const LyricsContainer = ({selectionCallback, openTip}: {selectionCallback: (text: string) => void, openTip: () => void}) => {
    const [line, setLine] = useState('')

    const annotate = () => {
        if (line.trim() === '') {
            return
        }
        selectionCallback(line.trim())
        openTip()
    }

    return (
        <div className='LyricsContainer'>
            <h2 className='lyric-container-title'>Lyrics</h2>
            <div className='lyric-container-body'>
                <p>Lyrics are switched off for now. Type the line you want to annotate.</p>
                <textarea className='textareacomment' rows={3} maxLength={500} aria-label='Line to annotate' value={line} onChange={e => setLine(e.target.value)}></textarea>
                <button className='page-pill no-outline' onClick={annotate}>Annotate</button>
            </div>
        </div>
    )
}

export default LyricsContainer
