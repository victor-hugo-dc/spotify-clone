import React, { useContext, useEffect, useState } from 'react';
import CommentSongInfo from './CommentSongInfo';
import formatTime from '../../utilities/time';
import { TokenContext } from '../../utilities/context';
import { spotify } from '../../utilities/spotify';
import type { User } from '../../utilities/types';

type Props = {user: string, timestamp: number, songID: string, commentBody: string, showSong: boolean}

export default function Comment({user, timestamp, songID, commentBody, showSong}: Props) {
    const [pfp, setPfp] = useState<string | undefined>(undefined);
    const token = useContext(TokenContext);

    useEffect(() => {
      const controller = new AbortController();
      spotify<User>(`/users/${user}`, token, { signal: controller.signal })
        .then((profile) => setPfp(profile.images?.[0]?.url))
        .catch((error) => console.log(error))
      return () => controller.abort()
    }, [user, token])
    

    return (
          <div className="spotify-tweet-box">
            <div className="avatar">
              <img src={pfp} className="timestamp" alt='pfp'></img>
            </div>
            <div className="content">
              <div className="header">
                <span className="username">{user}</span>
                <span className="time">@{formatTime(timestamp)}</span>
              </div>
              <div className="message">
                {commentBody}
              </div>
              {showSong ? 
                <CommentSongInfo songID = {songID}/>
                :
                <></>
              }
              
            </div>
          </div>

    )
}
