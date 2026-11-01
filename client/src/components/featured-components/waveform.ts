import type { SongComment } from '../../utilities/types'

// The heights (0 to 1) of a song's waveform bars, SoundCloud style: louder and quieter sections eased into each other,
// a little smoothed from bar to bar, with a quieter intro and outro.
// shortcut: Spotify gives apps no audio data, so the bars are made up, seeded by the track id (the same every time for a
// song, but not its sound), draw the real loudness if a source for it ever turns up.
export function waveform(id: string, bars: number) {
    // FNV-1a hashes the id into the seed of a mulberry32 generator.
    let seed = [...id].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)
    const random = () => {
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), seed | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32
    }
    const sections = Array.from({length: 8}, () => 0.55 + 0.45 * random())
    const noise = Array.from({length: bars}, random)
    const heights = noise.map((n, i) => {
        const x = i / (bars - 1) * (sections.length - 1), k = Math.floor(x), ease = (1 - Math.cos((x - k) * Math.PI)) / 2
        const section = (sections[k] ?? 0) * (1 - ease) + (sections[k + 1] ?? 0) * ease
        const detail = ((noise[i - 1] ?? n) + 2 * n + (noise[i + 1] ?? n)) / 4
        const fade = Math.min(1, (i + 1) / (bars * 0.06), (bars - i) / (bars * 0.1))
        return section * (0.3 + 0.7 * detail) * (0.2 + 0.8 * fade)
    })
    // The loudest bar reaches the top.
    const peak = Math.max(...heights)
    return heights.map((height) => height / peak)
}

// The comment the waveform shouts out at `position` (ms) in the song: of the top-level comments about the 4 s up to
// it, the most liked, then the most replied to, then the newest (the highest id, as older comments have no date).
export const shoutOut = (comments: SongComment[], position: number) =>
    comments.filter(({parentID, timestamp}) => parentID === null && timestamp <= position && timestamp > position - 4000)
        .sort((a, b) => b.likes - a.likes || b.replies - a.replies || b.id - a.id)[0] ?? null
