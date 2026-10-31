import { useContext } from 'react';
import { MessageContext, NowPlayingContext, PlayContext, TokenContext } from '../context';
import { playerCommand } from '../spotify';

// Play buttons: start `uri` (a playlist, album or artist context, or a track), or pause/resume it if it's already loaded.
export default function usePlayback() {
    const token = useContext(TokenContext)
    const updatePlayer = useContext(PlayContext)
    const setMessage = useContext(MessageContext)
    const nowPlaying = useContext(NowPlayingContext)

    const isLoaded = (uri: string) => uri !== '' && (nowPlaying.contextUri === uri || nowPlaying.trackUri === uri)
    const isPlaying = (uri: string) => nowPlaying.playing && isLoaded(uri)

    const toggle = (uri: string, start: object) => {
        const loaded = isLoaded(uri)
        playerCommand(`/me/player/${loaded && nowPlaying.playing ? 'pause' : 'play'}`, token, nowPlaying.deviceId, {method: 'PUT', body: loaded ? undefined : start})
            .then(() => updatePlayer())
            .catch((error) => setMessage(`ERROR: ${error.message}`))
    }

    return { nowPlaying, isPlaying, toggle }
}
