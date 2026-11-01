import { useContext, useEffect, useRef, useState } from 'react'
import { MessageContext, NowPlayingContext, PlayContext } from '../../utilities/context'
import { playerCommand, spotify } from '../../utilities/spotify'
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

// Plays the song `skips` places ahead (1: the next), skipping everything before it as Spotify's queue does. The Web API has
// no command for that, so it skips that many times, each after the last: Spotify can run concurrent commands out of order.
// Clicks on `queue` (as shown) after it has been skipped from are ignored until it's read again, since they'd count from
// places that have moved.
export function useSkipTo(queue: Queue | null | undefined) {
    const { deviceId } = useContext(NowPlayingContext)
    const updatePlayer = useContext(PlayContext)
    const setMessage = useContext(MessageContext)
    const stale = useRef<Queue | null | undefined>(undefined)

    return async (skips: number) => {
        if (stale.current === queue) return
        const from = (stale.current = queue)
        try {
            for (let i = 0; i < skips; i++) await playerCommand('/me/player/next', deviceId, { method: 'POST' })
            // The queue is read again when the playing song changes; if Spotify plays the same song again, it isn't.
            setTimeout(() => stale.current === from && (stale.current = undefined), 3000)
        } catch (error) {
            setMessage(`ERROR: ${(error as Error).message}`)
            stale.current = undefined
        }
        updatePlayer()
    }
}
