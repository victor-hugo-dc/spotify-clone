import type { PlaybackClock } from './context.ts'

// 61000 -> "1:01"
export default function formatTime(ms: number) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// Where playback is at `now`: the position measured at `at`, plus the time since while playing, never past the end.
// Counting time rather than timer ticks keeps it right in background tabs, whose timers browsers slow down.
export const positionAt = ({play, progress, at, total_time}: Omit<PlaybackClock, 'uri'>, now: number) =>
    Math.min(progress + (play ? Math.max(0, now - at) : 0), total_time)

// Spotify's "Date added": "14 hours ago" up to a month back, then "Sep 3, 2025".
export function addedAgo(iso: string, now = Date.now()) {
    const then = Date.parse(iso)
    let n = Math.max(0, Math.floor((now - then) / 1000))
    for (const [size, unit] of [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [5, 'week']] as const) {
        if (n < size) return `${n} ${unit}${n === 1 ? '' : 's'} ago`
        n = Math.floor(n / size)
    }
    return new Date(then).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})
}

// A list's length the way Spotify words it: "45 sec", "48 min 12 sec", "about 3 hr 20 min", "over 24 hr".
export function totalLength(ms: number) {
    const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60
    if (h >= 24) return 'over 24 hr'
    if (h > 0) return `about ${h} hr${m ? ` ${m} min` : ''}`
    return m ? `${m} min ${s % 60} sec` : `${s} sec`
}
