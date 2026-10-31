import React, { useState } from 'react'
import PromptButton from './PromptButton'

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
            <div className='lyric-container-title'>
                <h1>
                    Lyrics:
                </h1>
            </div>
            <div className='lyric-container-body'>
                <p>Lyrics are switched off for now. Type the line you want to annotate.</p>
                <textarea className='textareacomment' rows={3} value={line} onChange={e => setLine(e.target.value)}></textarea>
                <PromptButton name='Annotate' styleName='light' onClick={annotate}/>
            </div>
        </div>
    )
}

export default LyricsContainer
