import { useEffect, useState } from 'react'
import { coverColor } from '../color'

const cache = new Map<string, string | null>()

// The banner colour for a cover image, or null until it's known (or if the image can't be read).
export default function useCoverColor(url: string | null | undefined) {
    const [color, setColor] = useState<string | null>(() => (url && cache.get(url)) ?? null)

    useEffect(() => {
        if (!url) return setColor(null)
        if (cache.has(url)) return setColor(cache.get(url) ?? null)
        let live = true
        const image = new Image()
        // Spotify's image CDN allows CORS, so the canvas can be read back.
        image.crossOrigin = 'anonymous'
        image.onload = () => {
            let found: string | null = null
            try {
                const canvas = document.createElement('canvas')
                canvas.width = canvas.height = 24
                const context = canvas.getContext('2d')!
                context.drawImage(image, 0, 0, 24, 24)
                found = coverColor(context.getImageData(0, 0, 24, 24).data)
            } catch {
                // A cover served without CORS taints the canvas: no colour, the page keeps its grey.
            }
            cache.set(url, found)
            if (live) setColor(found)
        }
        image.onerror = () => { cache.set(url, null); if (live) setColor(null) }
        image.src = url
        return () => { live = false }
    }, [url])

    return color
}
