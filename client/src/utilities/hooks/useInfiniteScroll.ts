import { useCallback, useContext, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { MessageContext, TokenContext } from '../context';
import { spotify } from '../spotify';
import type { Paging } from '../types';

// Loads the next page of a Spotify list when the element given `lastRef` (the last row or card) scrolls into view.
// `toItem` unwraps paged entries such as playlist items; it must not change between renders.
export default function useInfiniteScroll<T, Raw = T>(setList: Dispatch<SetStateAction<T[]>>, toItem?: (raw: Raw) => T | null) {
    const token = useContext(TokenContext)
    const setMessage = useContext(MessageContext)
    const [next, setNext] = useState<string | null>(null)
    const observer = useRef<IntersectionObserver | null>(null)

    const lastRef = useCallback((node: HTMLElement | null) => {
        observer.current?.disconnect()
        if (!node || !next) return
        observer.current = new IntersectionObserver(([entry]) => {
            if (!entry?.isIntersecting) return
            observer.current?.disconnect()
            spotify<Paging<Raw>>(next, token)
                .then((page) => {
                    const items = toItem ? page.items.map(toItem) : (page.items as unknown as T[])
                    setList((list) => [...list, ...items.filter((item) => item !== null)])
                    setNext(page.next)
                })
                .catch((error) => setMessage(`ERROR: ${error.message}`))
        }, {threshold: 0.75})
        observer.current.observe(node)
    }, [next, token, toItem, setList, setMessage])

    return [setNext, lastRef] as const
}
