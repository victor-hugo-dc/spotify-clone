import { useContext, useEffect, useSyncExternalStore } from 'react'
import { LibraryContext, MessageContext } from '../context'
import { spotify } from '../spotify'

// Whether songs are in Liked Songs, kept once for every button showing one (the player bar's and the Now playing
// view's), so saving a song with one button shows on the other too. useLibrary keeps a separate state per button.
const saved = new Map<string, boolean>()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
}
const remember = (uri: string, inLibrary: boolean) => {
    saved.set(uri, inLibrary)
    listeners.forEach((listener) => listener())
}
// One question per song at a time, however many buttons show it. An answer asked for before a toggle is out of date.
const asking = new Set<string>()
let toggles = 0

// [saved, toggle] for a song's URI ('' for none).
export default function useLiked(uri: string) {
    const setMessage = useContext(MessageContext)
    const { refresh } = useContext(LibraryContext)
    const liked = useSyncExternalStore(subscribe, () => saved.get(uri) ?? false)

    // Asked again whenever a button for the song appears: it may have been saved or removed in another app since.
    useEffect(() => {
        if (!uri || asking.has(uri)) return
        asking.add(uri)
        const asked = toggles
        spotify<boolean[]>(`/me/library/contains?uris=${encodeURIComponent(uri)}`)
            .then(([inLibrary]) => asked === toggles && remember(uri, inLibrary === true))
            .catch((error) => console.log(error))
            .finally(() => asking.delete(uri))
    }, [uri])

    const toggle = () => {
        toggles++
        spotify(`/me/library?uris=${encodeURIComponent(uri)}`, { method: liked ? 'DELETE' : 'PUT' })
            .then(() => {
                setMessage(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs')
                remember(uri, !liked)
                // Spotify takes a moment to count the change.
                setTimeout(() => refresh('liked'), 1000)
            })
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return [liked, toggle] as const
}
