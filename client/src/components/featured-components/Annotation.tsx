import React from 'react';
import millisToTime from '../../utilities/millisToTime';

type Props = {user: string, timestamp: number, annotatedText: string, noteBody: string}

export default function Annotation({user, timestamp, annotatedText, noteBody}: Props) {
    return (
          <div className="spotify-tweet-box">
            <div className="avatar">
                <span className="timestamp">@{millisToTime(timestamp)}</span>
            </div>
            <div className="content">
                <div className="header">
                    <span className="username">{user}</span>
                </div>
                <div className="message">
                    
                    <h3>{noteBody}</h3>
                    <i>{annotatedText}</i>
                    
                </div>
            </div>
          </div>

    )
}
