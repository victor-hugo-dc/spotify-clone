import { useContext } from 'react';
import { MessageContext, NowPlayingContext, PlayContext, type NowPlaying } from '../context.ts';
import { playerCommand } from '../spotify.ts';

// The tracks toggle() last started as a plain list, with no context (how Liked Songs plays); starting anything else replaces them.
let started: string[] = []

// Whether the player is on `list` (a page's tracks as loaded so far) as toggle() last started it: with no context, on one of
// its tracks, and the same tracks as far as both go, since pages load as you scroll. A song card starts a lone track the
// same way, so one track only counts when it's the whole list.
export const isStartedList = (started: string[], list: string[], {contextUri, trackUri}: NowPlaying) =>
    !contextUri && trackUri !== null && started.includes(trackUri) && (started.length > 1 || list.length === 1) &&
    started.every((uri, i) => i >= list.length || uri === list[i])

// Play buttons: start `uri` (a playlist, album or artist context, or a track), or pause/resume it if it's already loaded.
export default function usePlayback() {
    const updatePlayer = useContext(PlayContext)
    const setMessage = useContext(MessageContext)
    const nowPlaying = useContext(NowPlayingContext)

    const isLoaded = (uri: string) => uri !== '' && (nowPlaying.contextUri === uri || nowPlaying.trackUri === uri)
    const isPlaying = (uri: string) => nowPlaying.playing && isLoaded(uri)
    const isStarted = (list: string[]) => isStartedList(started, list, nowPlaying)

    const toggle = (uri: string, start: object) => {
        const loaded = isLoaded(uri)
        playerCommand(`/me/player/${loaded && nowPlaying.playing ? 'pause' : 'play'}`, nowPlaying.deviceId, {method: 'PUT', body: loaded ? undefined : start})
            .then(() => {
                if (!loaded) started = (start as {uris?: string[]}).uris ?? []
                updatePlayer()
            })
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return { nowPlaying, isPlaying, isStarted, toggle }
}
