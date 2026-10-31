import React from 'react';
import formatTime from '../../utilities/time';
import type { SongAnnotation } from '../../utilities/types';

export default function Annotation({annotation}: {annotation: SongAnnotation}) {
    const {authorName, timestamp, annotatedText, noteBody} = annotation;

    return (
          <div className="spotify-tweet-box">
            <div className="avatar">
                <span className="timestamp">@{formatTime(timestamp)}</span>
            </div>
            <div className="content">
                <div className="header">
                    <span className="username">{authorName}</span>
                </div>
                <div className="message">
                    
                    <h3>{noteBody}</h3>
                    <i>{annotatedText}</i>
                    
                </div>
            </div>
          </div>

    )
}
