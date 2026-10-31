// Outline icons from Lucide (lucide.dev, ISC licence: see LUCIDE-LICENSE), drawn on its 24x24 grid in the current
// text colour. Generated from lucide-static 0.468.0.
import React, { type ReactNode } from 'react'
import type { IconProps } from '.'

const lucide = (shape: ReactNode) => ({ width = '24', height = '24' }: IconProps) => (
  <svg width={width} height={height} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    {shape}
  </svg>
)

// Home button in the top bar
export const House = lucide(<><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>)
// Browse, at the end of the search box
export const Browse = lucide(<><rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>)
// Install App and the download button
export const Download = lucide(<><circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="m8 12 4 4 4-4" /></>)
// What's New
export const Bell = lucide(<><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></>)
// Friend Activity
export const Friends = lucide(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>)
// Create
export const Plus = lucide(<><path d="M5 12h14" /><path d="M12 5v14" /></>)
// expand Your Library
export const Expand = lucide(<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line  /><line  /></>)
// scroll chips
export const ChevronLeft = lucide(<path d="m15 18-6-6 6-6" />)
// scroll chips
export const ChevronRight = lucide(<path d="m9 18 6-6-6-6" />)
// sort and view menus
export const List = lucide(<><path d="M3 12h.01" /><path d="M3 18h.01" /><path d="M3 6h.01" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M8 6h13" /></>)
// pinned library items
export const Pin = lucide(<><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></>)
// the library item that's playing
export const VolumePlaying = lucide(<><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></>)
// duration column
export const Clock = lucide(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>)
// save to Liked Songs
export const AddCircle = lucide(<><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></>)
// more options
export const More = lucide(<><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>)
// queue
export const Queue = lucide(<><path d="M21 15V6" /><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /><path d="M12 12H3" /><path d="M16 6H3" /><path d="M12 18H3" /></>)
// now playing view
export const NowPlayingView = lucide(<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /></>)
// full screen
export const Fullscreen = lucide(<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>)
// close
export const Close = lucide(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>)

// Saved: Spotify's filled check, in the current text colour (green where it's used).
export const Saved = ({ width = '24', height = '24' }: IconProps) => (
  <svg width={width} height={height} viewBox='0 0 24 24' aria-hidden='true'>
    <circle cx='12' cy='12' r='11' fill='currentColor' />
    <path d='m7 12.5 3.2 3.2L17 9' fill='none' stroke='#000' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)
