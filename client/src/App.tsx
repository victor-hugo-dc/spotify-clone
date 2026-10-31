import React, {useState, useEffect, useRef} from 'react';
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
import {UserContext, TokenContext, MessageContext, PlayContext, NowPlayingContext, type NowPlaying} from './utilities/context'
import { spotify } from './utilities/spotify'
import type { Paging, Playlist, User } from './utilities/types'

function App() {
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null);
  const [loginError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('error'))
  const [userInfo, setuserInfo] = useState<User | null>(null)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({trackUri: null, contextUri: null, playing: false, deviceId: null})

  const [status, setStatus] = useState(false) 
  const [message, setMessage] = useState('')

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const navigate = useNavigate()

  // The server keeps the refresh token in an httpOnly cookie and hands out access tokens, which last an hour.
  useEffect(() => {
    if (loginError) window.history.replaceState(null, '', '/')
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      fetch('/api/token')
        .then(async (response) => {
          if (response.status === 401) return setToken(null)
          if (!response.ok) throw new Error(`token refresh failed (${response.status})`)
          const { access_token, expires_in }: { access_token: string, expires_in: number } = await response.json()
          setToken(access_token)
          timer = setTimeout(refresh, (expires_in - 60) * 1000)
        })
        .catch((error) => {
          console.log(error)
          timer = setTimeout(refresh, 30 * 1000)
        })
        .finally(() => setLoading(false))
    }
    refresh()
    return () => clearTimeout(timer)
  // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (token) {
      spotify<User>('/me', token)
        .then(setuserInfo)
        .catch(error => console.log(error))
      refreshPlaylist()
    }
  // eslint-disable-next-line
  }, [token])


  const refreshPlaylist = () =>{
    spotify<Paging<Playlist>>('/me/playlists', token)
      .then((data) => setPlaylists(data.items))
      .catch(error => console.log(error));
  }

  // New playlists get Spotify's default name, numbered the way its apps do.
  const createPlaylist = () => {
    spotify<Playlist>('/me/playlists', token, {method: 'POST', body: {name: `My Playlist #${playlists.length + 1}`}})
      .then((playlist) => {
        refreshPlaylist()
        navigate(`/playlist/${playlist.id}`)
      })
      .catch(error => setStatusMessage(`ERROR: ${error.message}`))
  }

  const setStatusMessage = (message: string) => {
      clearTimeout(timerRef.current)
      setStatus(true)
      setMessage(message)
      timerRef.current = setTimeout(() => {
          setStatus(false)
      }, 3000)
  }


  const playerRef = useRef<PlayerHandle>(null)
  const updatePlayer = () => {
    playerRef.current?.updateState();
  }

  return (
    <div className="App">
      {loading? 
        <Loading type='app'/> :
        !token ?
        <Login error={loginError} /> :
        <MessageContext.Provider value={setStatusMessage}>
          <TokenContext.Provider value={token}>
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
                      <Featured playlists={playlists} refreshPlaylist={() => refreshPlaylist()} message={message} status={status} />
                    </UserContext.Provider>
                </NowPlayingContext.Provider>
              </PlayContext.Provider>

              <Footer>
                <Player token={token} onNowPlaying={setNowPlaying} ref={playerRef}/>
              </Footer>
          </TokenContext.Provider>
        </MessageContext.Provider>
      }
    </div>
  );
}

// Shoutify is friends-only: every account has to be on the Spotify app's
// allowlist, so there is nothing to show before logging in.
function Login({error}: {error: string | null}) {
  return (
    <div className='loading' style={{flexDirection: 'column', gap: '24px', color: '#fff', textAlign: 'center'}}>
      <h1>Shoutify</h1>
      <p>Friends only: ask whoever runs this Shoutify to add your Spotify account before you log in.</p>
      {error && <p role='alert'>That login didn't work ({error}). Please try again.</p>}
      <PromptButton to='/api/login' name='Log in with Spotify' styleName='light'/>
    </div>
  )
}

export default App;
