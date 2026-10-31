import React, { useState, useEffect } from 'react';

import { spotify } from '../../utilities/spotify';
import type { Track } from '../../utilities/types';

export default function CommentSongInfo({songID}: {songID: string}) {
    const [songData, setSongData] = useState({
        artist: "",
        album: "",
        track: ""
    })

    useEffect(() => {
        const controller = new AbortController();
        spotify<Track>(`/tracks/${songID}`, { signal: controller.signal })
            .then((track) => {
                const images = track.album?.images ?? [];
                setSongData({artist: track.artists[0]?.name ?? "", album: images[images.length - 1]?.url ?? "", track: track.name});
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [songID])

    return (
        <div className="spotify-track">
            <div className="player-cover">
                <img src={songData.album} alt='album'></img> 
            </div>
            <div className="track-details">
                <h2 className="track-name">{songData.track}</h2>
                <h3 className="artist-name">{songData.artist}</h3>
            </div>
        </div>
    );
}
