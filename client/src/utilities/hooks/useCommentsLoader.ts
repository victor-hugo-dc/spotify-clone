import { useEffect } from 'react';

const CHANGED = 'shoutify:comments-changed';

// Tells every list showing comments or annotations to reload.
export const commentsChanged = () => window.dispatchEvent(new Event(CHANGED));

// Runs `load` now, and again whenever a comment or annotation is saved anywhere in the app.
export default function useCommentsLoader(load: () => void, deps: unknown[]) {
    useEffect(() => {
        load()
        window.addEventListener(CHANGED, load)
        return () => window.removeEventListener(CHANGED, load)
    // eslint-disable-next-line
    }, deps)
}
