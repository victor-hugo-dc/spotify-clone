// The colour Spotify paints behind a cover: its average hue, weighted towards the colourful pixels, kept dark enough for
// white text on top. `pixels` is RGBA data from a canvas.
export function coverColor(pixels: Uint8ClampedArray) {
    let r = 0, g = 0, b = 0, total = 0
    for (let i = 0; i + 3 < pixels.length; i += 4) {
        const [pr = 0, pg = 0, pb = 0] = pixels.subarray(i, i + 3)
        const weight = (Math.max(pr, pg, pb) - Math.min(pr, pg, pb)) / 255 + 0.05
        r += pr * weight; g += pg * weight; b += pb * weight; total += weight
    }
    if (!total) return null
    const [h, s] = hsl(r / total, g / total, b / total)
    return `hsl(${Math.round(h)}, ${Math.round(Math.min(s, 0.7) * 100)}%, 32%)`
}

function hsl(r: number, g: number, b: number): [number, number] {
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, d = max - min, l = (max + min) / 2
    if (d === 0) return [0, 0]
    const s = d / (1 - Math.abs(2 * l - 1))
    const h = max === r / 255 ? ((g - b) / 255 / d) % 6 : max === g / 255 ? (b - r) / 255 / d + 2 : (r - g) / 255 / d + 4
    return [(h * 60 + 360) % 360, s]
}
