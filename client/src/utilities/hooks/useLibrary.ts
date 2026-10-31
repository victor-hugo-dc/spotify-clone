import { useContext, useEffect, useState } from 'react';
import { LibraryContext, MessageContext } from '../context';
import { spotify } from '../spotify';

// Whether `uri` (a track, album, artist or playlist) is in the user's library, and a toggle for it.
export default function useLibrary(uri: string, place = 'Your Library') {
    const setMessage = useContext(MessageContext)
    const {refresh} = useContext(LibraryContext)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        setSaved(false)
        if (!uri) return
        const controller = new AbortController()
        spotify<boolean[]>(`/me/library/contains?uris=${encodeURIComponent(uri)}`, {signal: controller.signal})
            .then(([inLibrary]) => setSaved(inLibrary === true))
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [uri])

    const toggle = () => {
        spotify(`/me/library?uris=${encodeURIComponent(uri)}`, {method: saved ? 'DELETE' : 'PUT'})
            .then(() => {
                setMessage(saved ? `Removed from ${place}` : `Added to ${place}`)
                setSaved(!saved)
                // Your Library lists albums, artists and playlists (not songs); Spotify takes a moment to show the change.
                if (!uri.startsWith('spotify:track:')) setTimeout(refresh, 1000)
            })
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return [saved, toggle] as const
}
