import { useEffect, useState } from 'react'
import { spotify } from '../../utilities/spotify'
import type { Image } from '../../utilities/types'

// A song, or a podcast episode: episodes have their own images and a show instead of an album and artists.
export type QueueItem = { uri: string; name: string; album?: { images: Image[] }; artists?: { name: string }[]; images?: Image[]; show?: { name: string } }
type Queue = { currently_playing: QueueItem | null; queue: QueueItem[] }

// The playing song and what's next (/me/player/queue), asked again when `uri`, the playing song, changes: undefined until
// Spotify answers, null if it couldn't.
export default function useQueue(uri: string | undefined) {
    const [queue, setQueue] = useState<Queue | null>()

    useEffect(() => {
        const controller = new AbortController()
        // Nothing playing anywhere: Spotify answers with no body.
        spotify<Queue | undefined>('/me/player/queue', { signal: controller.signal })
            .then((answer) => setQueue(answer ?? { currently_playing: null, queue: [] }), () => setQueue(null))
        return () => controller.abort()
    }, [uri])

    return queue
}
