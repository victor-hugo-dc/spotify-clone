import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
// Before the components, so each area's own stylesheet (imported by its component) comes after the frame's.
import './styles/layout.css'

import TopBar from './components/top-bar/TopBar'
import YourLibrary from './components/sidebar-components/YourLibrary'
import RightSidebar from './components/right-sidebar/RightSidebar'
import Footer from './components/footer-components/Footer'
import PromptButton from './components/featured-components/PromptButton'
import Player, { type PlayerHandle } from './components/footer-components/Player'
import PageContent from './components/featured-components/PageContent'
import Loading from './components/featured-components/Loading'
import {UserContext, MessageContext, PlayContext, NowPlayingContext, LibraryContext, LayoutContext, type Library, type LibraryKind, type NowPlaying, type RightPanel} from './utilities/context'
import { allPages, spotify } from './utilities/spotify'
import { retried } from './utilities/retry'
import { refreshSession } from './utilities/session'
import type { Artist, Paging, PlayHistory, Playlist, SavedAlbum, User } from './utilities/types'

// Each viewer's right panel (or none) is remembered in their browser. Storage can be blocked or cleared (private
// windows); then it's the Now playing view, as on Spotify.
const PANEL_KEY = 'shoutify:right-panel'
function storedPanel(): RightPanel {
  try {
    const saved = localStorage.getItem(PANEL_KEY)
    if (saved === 'closed') return null
    if (saved === 'queue' || saved === 'friends') return saved
  } catch {
    // blocked: use the default
  }
  return 'now-playing'
}

// Your Library's lists, each loaded on its own: every page (not just Spotify's first 20); recently played has no more
// than 50 to page through, and Liked Songs only needs its count. `name` is for the toast when one can't be loaded.
const libraryLists: Record<LibraryKind, {name: string, load: () => Promise<Partial<Library>>}> = {
  playlists: {name: 'playlists', load: () => allPages<Playlist>('/me/playlists?limit=50').then((playlists) => ({playlists}))},
  albums: {name: 'albums', load: () => allPages<SavedAlbum>('/me/albums?limit=50').then((albums) => ({albums}))},
  artists: {name: 'artists', load: () => allPages<Artist>('/me/following?type=artist&limit=50', (data) => data.artists).then((artists) => ({artists}))},
  recent: {name: 'recently played songs', load: () => spotify<Paging<PlayHistory>>('/me/player/recently-played?limit=50').then((page) => ({recentlyPlayed: page.items}))},
  liked: {name: 'Liked Songs', load: () => spotify<Paging<unknown>>('/me/tracks?limit=1').then((page) => ({likedTotal: page.total ?? null}))},
}

function App() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('error'))
  const [userInfo, setuserInfo] = useState<User | null>(null)
  const [libraryData, setLibraryData] = useState<Omit<Library, 'refresh'>>({playlists: [], albums: [], artists: [], recentlyPlayed: [], likedTotal: null})
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({trackUri: null, contextUri: null, playing: false, deviceId: null, track: null, device: null})
  const [rightPanel, setRightPanelState] = useState(storedPanel)

  const [status, setStatus] = useState(false) 
  const [message, setMessage] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Context values keep their identity across renders, so a toast doesn't re-run the effects and callbacks that use them.
  const setStatusMessage = useCallback((message: string) => {
      clearTimeout(timerRef.current)
      setStatus(true)
      setMessage(message)
      timerRef.current = setTimeout(() => {
          setStatus(false)
      }, 3000)
  }, [])

  // Logged in if the server can trade its refresh cookie for a token. A server or network hiccup isn't a logout: keep
  // showing the loading screen and try again.
  useEffect(() => {
    if (loginError) window.history.replaceState(null, '', '/')
    let timer: ReturnType<typeof setTimeout>
    const check = () => {
      refreshSession()
        .then((session) => {
          setLoggedIn(session !== null)
          setLoading(false)
        })
        .catch((error) => {
          console.log(error)
          timer = setTimeout(check, 30 * 1000)
        })
    }
    check()
    return () => clearTimeout(timer)
  // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (loggedIn) {
      spotify<User>('/me')
        .then(setuserInfo)
        .catch(error => console.log(error))
      refreshLibrary()
    }
  // eslint-disable-next-line
  }, [loggedIn])

  // A list that fails is asked for again (Spotify may be busy), and named in a toast if it still fails. Loads are
  // numbered, so a slower older one can't overwrite a newer one that has landed.
  const loads = useRef({started: 0, landed: {} as Partial<Record<LibraryKind, number>>})
  const refreshLibrary = useCallback((kind?: LibraryKind) => {
    for (const list of kind ? [kind] : Object.keys(libraryLists) as LibraryKind[]) {
      const load = ++loads.current.started
      const newest = () => load > (loads.current.landed[list] ?? 0)
      retried(libraryLists[list].load).then((loaded) => {
        if (!newest()) return
        loads.current.landed[list] = load
        setLibraryData((data) => ({...data, ...loaded}))
      }, (error) => {
        if (newest()) setStatusMessage(`Couldn't load your ${libraryLists[list].name}: ${error.message}`)
      })
    }
  }, [setStatusMessage])
  const library = useMemo(() => ({...libraryData, refresh: refreshLibrary}), [libraryData, refreshLibrary])

  const setRightPanel = useCallback((panel: RightPanel) => {
    setRightPanelState(panel)
    try {
      localStorage.setItem(PANEL_KEY, panel ?? 'closed')
    } catch {
      // blocked: remembered until the page reloads
    }
  }, [])
  const layout = useMemo(() => ({rightPanel, setRightPanel}), [rightPanel, setRightPanel])


  const playerRef = useRef<PlayerHandle>(null)
  const updatePlayer = useCallback(() => {
    playerRef.current?.updateState();
  }, [])

  return (
    <div className="App">
      {loading? 
        <Loading type='app'/> :
        !loggedIn ?
        <Login error={loginError} /> :
        // The frame (styles/layout.css): top bar, Your Library, the page, the right panel and the player.
        <MessageContext.Provider value={setStatusMessage}>
          <UserContext.Provider value={userInfo}>
            <LibraryContext.Provider value={library}>
              <LayoutContext.Provider value={layout}>
                <PlayContext.Provider value={updatePlayer}>
                  <NowPlayingContext.Provider value={nowPlaying}>
                    <TopBar />
                    <YourLibrary />
                    <main className='featured'>
                      <PageContent message={message} status={status} />
                    </main>
                    <RightSidebar />
                    <Footer>
                      <Player onNowPlaying={setNowPlaying} ref={playerRef}/>
                    </Footer>
                  </NowPlayingContext.Provider>
                </PlayContext.Provider>
              </LayoutContext.Provider>
            </LibraryContext.Provider>
          </UserContext.Provider>
        </MessageContext.Provider>
      }
    </div>
  );
}

// Shoutify is friends-only: every account has to be on the Spotify app's
// allowlist, so there is nothing to show before logging in.
const loginErrors: Record<string, string> = {
  access_denied: 'You cancelled the Spotify login.',
  not_allowlisted: "Your Spotify account isn't on this Shoutify's list yet. Ask whoever runs it to add you, then try again.",
}

function Login({error}: {error: string | null}) {
  return (
    <div className='loading' style={{flexDirection: 'column', gap: '24px', color: '#fff', textAlign: 'center'}}>
      <h1>Shoutify</h1>
      <p>Friends only: ask whoever runs this Shoutify to add your Spotify account before you log in.</p>
      {error && <p role='alert'>{loginErrors[error] ?? `That login didn't work (${error}). Please try again.`}</p>}
      <PromptButton to='/api/login' name='Log in with Spotify' styleName='light'/>
    </div>
  )
}

export default App;
