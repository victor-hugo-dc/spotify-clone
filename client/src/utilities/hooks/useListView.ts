import { useState } from 'react';

export type ListView = 'list' | 'compact';

const KEY = 'shoutify:list-view';

// How track lists are drawn: List (with covers) or Compact, remembered per browser. Where storage is blocked it's
// List on each visit.
export default function useListView() {
    const [view, setView] = useState<ListView>(() => {
        try {
            return localStorage.getItem(KEY) === 'compact' ? 'compact' : 'list'
        } catch {
            return 'list'
        }
    })

    const choose = (next: ListView) => {
        setView(next)
        try {
            localStorage.setItem(KEY, next)
        } catch {
            // Not remembered: this visit keeps it all the same.
        }
    }

    return [view, choose] as const
}
