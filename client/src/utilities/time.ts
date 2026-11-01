import type { PlaybackClock } from './context.ts'

// 61000 -> "1:01"
export default function formatTime(ms: number) {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// A time someone typed, "1:05" or past an hour "1:02:05", in ms; null if it's anything else or after `duration`.
export function parseTime(text: string, duration: number) {
    const match = /^(?:(\d+):([0-5]\d)|(\d+)):([0-5]\d)$/.exec(text.trim())
    if (!match) return null
    const [, h, mm, m, ss] = match
    const ms = ((Number(h ?? 0) * 60 + Number(mm ?? m)) * 60 + Number(ss)) * 1000
    return ms <= duration ? ms : null
}

// Where playback is at `now`: the position measured at `at`, plus the time since while playing, never past the end.
// Counting time rather than timer ticks keeps it right in background tabs, whose timers browsers slow down.
export const positionAt = ({play, progress, at, total_time}: Omit<PlaybackClock, 'uri'>, now: number) =>
    Math.min(progress + (play ? Math.max(0, now - at) : 0), total_time)

// When a comment was posted, as Twitter says it: "now", "45s", "12m", "3h", "5d", then "Oct 31", or "Oct 31, 2025"
// before this year.
export function postedAgo(ms: number, now = Date.now()) {
    let n = Math.floor((now - ms) / 1000)
    if (n < 5) return 'now'
    for (const [size, unit] of [[60, 's'], [60, 'm'], [24, 'h'], [7, 'd']] as const) {
        if (n < size) return `${n}${unit}`
        n = Math.floor(n / size)
    }
    const date = new Date(ms)
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: date.getFullYear() === new Date(now).getFullYear() ? undefined : 'numeric'})
}

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
