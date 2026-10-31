import React, {useState, useEffect, useRef} from 'react';

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
import Player from './components/footer-components/Player'
import Featured from './components/featured-components/Featured'
import Loading from './components/featured-components/Loading'
import {UserContext, TokenContext, MessageContext, PlayContext, SongContext} from './utilities/context'
import getHashParams from './utilities/getHashParams';

function App() {
  const [loading, setLoading] = useState(true)
  const [loggedIn, setloggedIn] = useState(localStorage.getItem('token') !== null)
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userInfo, setuserInfo] = useState({})
  const [playlists, setPlaylists] = useState([])

  const [status, setStatus] = useState(false) 
  const [message, setMessage] = useState('')
  // Boolean value that will be used to detect when I song has changed
  const [song, setSong] = useState(0)

  const timerRef = useRef(null)

  useEffect(() => {
    if (token) {
      setLoading(false);
      return;
    }

    let access_token = null;
    const hash = getHashParams();
    if (hash.access_token) {
      access_token = hash.access_token;
    }

    if (access_token) {
      setToken(access_token)
      localStorage.setItem('token', access_token);
      setloggedIn(true)
      window.location.hash = ''
    }

    setLoading(false);

  }, [token])

  useEffect(() => {
    if (token) {
      const headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
      fetch('https://api.spotify.com/v1/me', { method: 'GET', headers })
        .then((response) => {
          console.log(response.json().then(
            (data) => { 
              console.log(data)
              setuserInfo(data)
            }
          ));
        });

      fetch('https://api.spotify.com/v1/me/playlists', { method: 'GET', headers })
        .then((response) => {
          console.log(response.json().then(
            (data) => { 
              setPlaylists(data.items)
            }
          ));
        });
    }
  }, [token])


  const refreshPlaylist = () =>{
    fetch('https://api.spotify.com/v1/me/playlists', {
          method: 'GET', headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          }
      })
      .then((response) => {
        console.log(response.json().then(
          (data) => { 
            setPlaylists(data.items);
          }
        ));
      })
      .catch(error => console.log(error));
  }

  const setStatusMessage = (message) => {
      clearTimeout(timerRef.current)
      setStatus(true)
      setMessage(message)
      timerRef.current = setTimeout(() => {
          setStatus(false)
      }, 3000)
  }


  const playerRef = useRef(null)
  const updatePlayer = () => {
    if (playerRef.current) {
      playerRef.current.updateState();
    }
    
  }

  return (
    <div className="App">
      {loading? 
        <Loading type='app'/> :
        !loggedIn ?
        <Login /> :
        <MessageContext.Provider value={setStatusMessage}>
            <SongContext.Provider value={{song, setSong}}>
              <Sidebar>
                <Logo />
                <NavList>
                  <TokenContext.Provider value={token}>
                    <NavItem to='/' exact={true} name='Home' label='Home' />
                    <NavItem to='/search' exact={true} name='Search' label='Search' />
                    <NavItem to='/social' exact={true} name='Social' label='Social'/> 
                    <NavItem to='/collection' exact={false} name='Library' label='Your Library'/>
                  </TokenContext.Provider>
                  
                </NavList>
                <PlayLists 
                  top={<FeaturedPlaylist>
                          <FeaturedItem to='/tracks' exact={true} name='Liked Songs' label='Liked Songs'/>
                        </FeaturedPlaylist>}
                  bottom={<OtherPlaylist playlists={playlists}/>}
                />
                <InstallCTA />
              </Sidebar>
              
              <PlayContext.Provider value={updatePlayer}>
                <TokenContext.Provider value={token}>
                    <UserContext.Provider value={userInfo}>
                      <Featured playlists={playlists} refreshPlaylist={() => refreshPlaylist()} message={message} status={status} />
                    </UserContext.Provider>
                </TokenContext.Provider>
                
              </PlayContext.Provider>

              <Footer>
                <Player token={token} ref={playerRef}/>
              </Footer>
            </SongContext.Provider>     

        </MessageContext.Provider>
      }
    </div>
  );
}

// Shoutify is friends-only: every account has to be on the Spotify app's
// allowlist, so there is nothing to show before logging in.
function Login() {
  return (
    <div className='loading' style={{flexDirection: 'column', gap: '24px', color: '#fff', textAlign: 'center'}}>
      <h1>Shoutify</h1>
      <p>Friends only: ask whoever runs this Shoutify to add your Spotify account before you log in.</p>
      <PromptButton to='/api/login' name='Log in with Spotify' styleName='light'/>
    </div>
  )
}

export default App;
