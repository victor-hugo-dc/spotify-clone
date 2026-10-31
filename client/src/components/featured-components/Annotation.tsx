import React from 'react';
import { Avatar } from './Comment';
import formatTime from '../../utilities/time';
import type { SongAnnotation } from '../../utilities/types';

// An annotation: who wrote it and where in the song, the line it's about, and their note.
export default function Annotation({annotation}: {annotation: SongAnnotation}) {
    const {authorName, authorImage, timestamp, annotatedText, noteBody} = annotation;

    return (
          <div className="spotify-tweet-box">
            <Avatar name={authorName} image={authorImage}/>
            <div className="content">
                <div className="header">
                    <span className="username">{authorName}</span>
                    <span className="time">@{formatTime(timestamp)}</span>
                </div>
                <blockquote className="annotated-line">{annotatedText}</blockquote>
                <div className="message">{noteBody}</div>
            </div>
          </div>

    )
}
