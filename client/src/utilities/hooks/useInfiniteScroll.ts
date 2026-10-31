import { useCallback, useContext, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { MessageContext } from '../context';
import { spotify } from '../spotify';
import type { Paging } from '../types';

// Loads the next page of a Spotify list when the element given `lastRef` (the last row or card) scrolls into view.
// `toItem` unwraps paged entries such as playlist items; it must not change between renders.
// The page sets the first `next` link; doing so cancels the previous list's pending page, so it can't be appended to this one.
export default function useInfiniteScroll<T, Raw = T>(setList: Dispatch<SetStateAction<T[]>>, toItem?: (raw: Raw) => T | null) {
    const setMessage = useContext(MessageContext)
    const [next, setNext] = useState<string | null>(null)
    const observer = useRef<IntersectionObserver | null>(null)
    // The page asked for last. Each is requested once: not again while it loads, nor after it failed.
    const request = useRef<{url: string, controller: AbortController} | null>(null)

    const start = useCallback((first: string | null) => {
        request.current?.controller.abort()
        request.current = null
        setNext(first)
    }, [])

    const lastRef = useCallback((node: HTMLElement | null) => {
        observer.current?.disconnect()
        if (!node || !next) return
        observer.current = new IntersectionObserver(([entry]) => {
            if (!entry?.isIntersecting || request.current?.url === next) return
            observer.current?.disconnect()
            const controller = new AbortController()
            request.current = {url: next, controller}
            spotify<Paging<Raw>>(next, {signal: controller.signal})
                .then((page) => {
                    const items = toItem ? page.items.map(toItem) : (page.items as unknown as T[])
                    setList((list) => [...list, ...items.filter((item) => item !== null)])
                    setNext(page.next)
                })
                .catch((error) => setMessage(`ERROR: ${error.message}`))
        }, {threshold: 0.75})
        observer.current.observe(node)
    }, [next, toItem, setList, setMessage])

    return [start, lastRef] as const
}
