import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';

import { spotify } from '../../utilities/spotify';
import type { SongComment, Track } from '../../utilities/types';

// Comments saved before they carried their song look it up: once per song, however many comments it has.
const lookups = new Map<string, Promise<Track>>();
function lookup(id: string) {
    let track = lookups.get(id);
    if (!track) {
        track = spotify<Track>(`/tracks/${id}`);
        lookups.set(id, track);
        track.catch(() => lookups.delete(id));
    }
    return track;
}

type Song = Pick<SongComment, 'songID' | 'songName' | 'songArtist' | 'songImage'>

// The song a comment (or a page) is about, as a row like Spotify's lists, linking to the song's comments (with router
// `state` for that page, if given).
export default function CommentSongInfo({songID, songName, songArtist, songImage, state}: Song & {state?: object}) {
    const [song, setSong] = useState({name: songName ?? '', artist: songArtist ?? '', image: songImage ?? ''});

    useEffect(() => {
        if (songName) return;
        lookup(songID)
            .then((track) => setSong({name: track.name, artist: track.artists[0]?.name ?? '', image: track.album?.images.at(-1)?.url ?? ''}))
            .catch((error) => console.log(error))
    }, [songID, songName])

    return (
        <Link to={`/comments/${songID}`} state={state} className="spotify-track">
            <div className="player-cover">
                {song.image && <img src={song.image} alt=''></img>}
            </div>
            <div className="track-details">
                <span className="track-name">{song.name}</span>
                <span className="artist-name">{song.artist}</span>
            </div>
        </Link>
    );
}
