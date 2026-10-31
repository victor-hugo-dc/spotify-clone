import { useContext, useEffect, useState } from 'react';
import { MessageContext, TokenContext } from '../context';
import { spotify } from '../spotify';

// Whether `uri` (a track, album, artist or playlist) is in the user's library, and a toggle for it.
export default function useLibrary(uri: string, place = 'Your Library', onChange?: () => void) {
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setSaved(false)
        if (!uri) return
        const controller = new AbortController()
        spotify<boolean[]>(`/me/library/contains?uris=${encodeURIComponent(uri)}`, token, {signal: controller.signal})
            .then(([inLibrary]) => setSaved(inLibrary === true))
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [uri, token])

    const toggle = () => {
        spotify(`/me/library?uris=${encodeURIComponent(uri)}`, token, {method: saved ? 'DELETE' : 'PUT'})
            .then(() => {
                setMessage(saved ? `Removed from ${place}` : `Added to ${place}`)
                setSaved(!saved)
                onChange?.()
            })
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return [saved, toggle] as const
}
