import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';

import TopBar from './components/top-bar/TopBar'
import YourLibrary from './components/sidebar-components/YourLibrary'
import RightSidebar from './components/right-sidebar/RightSidebar'
import Footer from './components/footer-components/Footer'
import PromptButton from './components/featured-components/PromptButton'
import Player, { type PlayerHandle } from './components/footer-components/Player'
import PageContent from './components/featured-components/PageContent'
import Loading from './components/featured-components/Loading'
import {UserContext, MessageContext, PlayContext, NowPlayingContext, LibraryContext, LayoutContext, type NowPlaying, type RightPanel} from './utilities/context'
import { allPages, spotify } from './utilities/spotify'
import { refreshSession } from './utilities/session'
import type { Artist, Paging, PlayHistory, Playlist, SavedAlbum, User } from './utilities/types'
import './styles/layout.css'

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

function App() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('error'))
  const [userInfo, setuserInfo] = useState<User | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [albums, setAlbums] = useState<SavedAlbum[]>([])
  const [artists, setArtists] = useState<Artist[]>([])
  const [recentlyPlayed, setRecentlyPlayed] = useState<PlayHistory[]>([])
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({trackUri: null, contextUri: null, playing: false, deviceId: null, track: null, device: null})
  const [rightPanel, setRightPanelState] = useState(storedPanel)

  const [status, setStatus] = useState(false) 
  const [message, setMessage] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

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

  // Your Library, every page of it (not just Spotify's first 20). Recently played has no more than 50 to page through.
  const refreshLibrary = useCallback(() => {
    const log = (error: Error) => console.log(error)
    allPages<Playlist>('/me/playlists?limit=50').then(setPlaylists).catch(log)
    allPages<SavedAlbum>('/me/albums?limit=50').then(setAlbums).catch(log)
    allPages<Artist>('/me/following?type=artist&limit=50', (data) => data.artists).then(setArtists).catch(log)
    spotify<Paging<PlayHistory>>('/me/player/recently-played?limit=50').then((page) => setRecentlyPlayed(page.items)).catch(log)
  }, [])
  const library = useMemo(() => ({playlists, albums, artists, recentlyPlayed, refresh: refreshLibrary}),
    [playlists, albums, artists, recentlyPlayed, refreshLibrary])

  const setRightPanel = useCallback((panel: RightPanel) => {
    setRightPanelState(panel)
    try {
      localStorage.setItem(PANEL_KEY, panel ?? 'closed')
    } catch {
      // blocked: remembered until the page reloads
    }
  }, [])
  const layout = useMemo(() => ({rightPanel, setRightPanel}), [rightPanel, setRightPanel])

  // Context values keep their identity across renders, so a toast doesn't re-run the effects and callbacks that use them.
  const setStatusMessage = useCallback((message: string) => {
      clearTimeout(timerRef.current)
      setStatus(true)
      setMessage(message)
      timerRef.current = setTimeout(() => {
          setStatus(false)
      }, 3000)
  }, [])


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
