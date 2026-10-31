import React, {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import { useNavigate } from 'react-router';

import Sidebar from './components/sidebar-components/Sidebar'
import Logo from './components/sidebar-components/Logo'
import NavList from './components/sidebar-components/NavList'
import NavItem from './components/sidebar-components/NavItem'
import PlayLists from './components/sidebar-components/PlayLists'
import FeaturedPlaylist from './components/sidebar-components/FeaturedPlaylist'
import FeaturedItem from './components/sidebar-components/FeaturedItem'
import OtherPlaylist from './components/sidebar-components/OtherPlaylist'
import InstallCTA from './components/sidebar-components/InstallCTA'
import Footer from './components/footer-components/Footer'
import PromptButton from './components/featured-components/PromptButton'
import Player, { type PlayerHandle } from './components/footer-components/Player'
import Featured from './components/featured-components/Featured'
import Loading from './components/featured-components/Loading'
import {UserContext, MessageContext, PlayContext, NowPlayingContext, LibraryContext, type NowPlaying} from './utilities/context'
import { allPages, spotify } from './utilities/spotify'
import { refreshSession } from './utilities/session'
import type { Artist, Paging, PlayHistory, Playlist, SavedAlbum, User } from './utilities/types'

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

  const [status, setStatus] = useState(false) 
  const [message, setMessage] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const navigate = useNavigate()

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

  // New playlists get Spotify's default name, numbered the way its apps do.
  const createPlaylist = () => {
    spotify<Playlist>('/me/playlists', {method: 'POST', body: {name: `My Playlist #${playlists.length + 1}`}})
      .then((playlist) => {
        refreshLibrary()
        navigate(`/playlist/${playlist.id}`)
      })
      .catch(error => setStatusMessage(`ERROR: ${error.message}`))
  }

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
        <MessageContext.Provider value={setStatusMessage}>
              <Sidebar>
                <Logo />
                <NavList>
                    <NavItem to='/' exact={true} name='Home' label='Home' />
                    <NavItem to='/search' exact={true} name='Search' label='Search' />
                    <NavItem to='/social' exact={true} name='Social' label='Social'/> 
                    <NavItem to='/collection' name='Library' label='Your Library'/>
                </NavList>
                <PlayLists 
                  top={<FeaturedPlaylist onCreatePlaylist={createPlaylist}>
                          <FeaturedItem to='/tracks' exact={true} label='Liked Songs'/>
                        </FeaturedPlaylist>}
                  bottom={<OtherPlaylist playlists={playlists}/>}
                />
                <InstallCTA />
              </Sidebar>
              
              <PlayContext.Provider value={updatePlayer}>
                <NowPlayingContext.Provider value={nowPlaying}>
                    <UserContext.Provider value={userInfo}>
                      <LibraryContext.Provider value={library}>
                        <Featured message={message} status={status} />
                      </LibraryContext.Provider>
                    </UserContext.Provider>
                </NowPlayingContext.Provider>
              </PlayContext.Provider>

              <Footer>
                <Player onNowPlaying={setNowPlaying} ref={playerRef}/>
              </Footer>
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
