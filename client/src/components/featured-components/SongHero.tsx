import React, { Fragment, useContext, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Comment';
import Icon from '../icons';
import { shoutOut, waveform } from './waveform';
import formatTime, { positionAt } from '../../utilities/time';
import useCoverColor from '../../utilities/hooks/useCoverColor';
import usePlayback from '../../utilities/hooks/usePlayback';
import { SeekContext, usePlaybackClock, type PlaybackClock } from '../../utilities/context';
import type { SongComment, Track } from '../../utilities/types';

const BARS = 200;

// The top of a song's page, laid out like SoundCloud's track header on a band from the cover's colour to dark: the play
// button, the title and artists on black labels, the album and year, the waveform under them, and at the right the
// cover, whole (Spotify doesn't let apps crop covers or draw over them). onShow: a comment's marker was clicked.
export default function SongHero({track, comments, onShow}: {track: Track, comments: SongComment[], onShow: (comment: SongComment) => void}) {
    const {isPlaying, toggle} = usePlayback();
    const cover = track.album?.images[0]?.url;
    const color = useCoverColor(cover);
    const playing = isPlaying(track.uri);

    return (
        <header className='song-hero' style={{'--hero-color': color ?? '#535353'} as CSSProperties}>
            <div className='song-hero-content'>
                <button className='song-hero-play no-outline' title={playing ? 'Pause' : 'Play'} aria-label={`${playing ? 'Pause' : 'Play'} ${track.name}`}
                        onClick={() => toggle(track.uri, {uris: [track.uri]})}>
                    <Icon name={playing ? 'Pause' : 'Play'} width='28' height='28'/>
                </button>
                <div className='song-hero-info'>
                    <h1 className='song-hero-title'>{track.name}</h1>
                    <p className='song-hero-artists'>
                        {track.artists.map((artist, i) =>
                            <Fragment key={artist.id}>{i > 0 && ', '}<Link to={`/artist/${artist.id}`}>{artist.name}</Link></Fragment>)}
                    </p>
                    {track.album &&
                        <p className='song-hero-album'>
                            <Link to={`/album/${track.album.id}`}>{track.album.name}</Link>
                            <span>{track.album.release_date.slice(0, 4)}</span>
                        </p>}
                </div>
                {cover && <img className='song-hero-cover' src={cover} alt=''/>}
                <Waveform track={track} comments={comments} onShow={onShow}/>
            </div>
        </header>
    );
}

// SoundCloud's waveform, as a slider like the player's seek bar: green up to the playhead, grey after, brighter up to
// the pointer while it's over it. It follows playback while this is the song loaded, and sits at the start otherwise.
// A click or drag moves the song there (or starts it there, if it isn't loaded), and so do the arrow keys (5 s), Home
// and End: held, they add up, and the playhead is sent once they're let go. Along the bottom, each comment's marker;
// above, the bubble of the one hovered or focused, or while the song plays, of the one it shouts out.
function Waveform({track, comments, onShow}: {track: Track, comments: SongComment[], onShow: (comment: SongComment) => void}) {
    const {toggle} = usePlayback();
    const clock = usePlaybackClock();
    const seek = useContext(SeekContext);
    const {uri, duration_ms: duration} = track;
    const live = clock.uri === uri;
    const playing = live && clock.play;
    const [now, setNow] = useState(Date.now);
    // Where a drag or held keys have the playhead; where it was sent, until the player next reports.
    const [scrub, setScrub] = useState<number | null>(null);
    const [sent, setSent] = useState<{ms: number, clock: PlaybackClock} | null>(null);
    const [hover, setHover] = useState<number | null>(null);
    const [peek, setPeek] = useState<SongComment | null>(null);
    const position = scrub ?? (sent?.clock === clock ? sent.ms : live ? positionAt(clock, now) : 0);
    const bubble = peek ?? (playing ? shoutOut(comments, position) : null);

    // On twice a second while it plays.
    useEffect(() => {
        if (!playing) return;
        const tick = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(tick);
    }, [playing]);

    // The bars mask the colours: up from the line, and a fainter reflection down from it.
    const bars = useMemo(() => {
        const heights = waveform(track.id, BARS);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BARS * 3 - 1} 100" preserveAspectRatio="none">` +
            `<path d="${heights.map((h, i) => `M${i * 3} 70V${(70 - h * 70).toFixed(1)}h2V70z`).join('')}"/>` +
            `<path fill-opacity=".4" d="${heights.map((h, i) => `M${i * 3} 71v${(h * 29).toFixed(1)}h2V71z`).join('')}"/></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    }, [track.id]);

    const along = (ms: number) => `${Math.min(ms / duration, 1) * 100}%`;
    const clamp = (ms: number) => Math.round(Math.min(Math.max(ms, 0), duration));
    const at = (event: React.PointerEvent<HTMLElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        return clamp((event.clientX - box.left) / box.width * duration);
    };
    const keys: Record<string, (ms: number) => number> = {ArrowLeft: (ms) => ms - 5000, ArrowRight: (ms) => ms + 5000, Home: () => 0, End: () => duration};

    const commit = (ms: number | null) => {
        if (ms === null) return;
        setScrub(null);
        setSent({ms, clock});
        if (live) seek(ms);
        else toggle(uri, {uris: [uri], position_ms: ms});
    };

    return (
        <div className='waveform'>
            {bubble &&
                <div key={bubble.id} className='waveform-bubble' aria-hidden='true' style={{'--at': along(bubble.timestamp)} as CSSProperties}>
                    <Avatar name={bubble.authorName} image={bubble.authorImage}/>
                    <p><span>{bubble.authorName}</span> {bubble.commentBody}</p>
                </div>}
            <div className='waveform-slider' role='slider' tabIndex={0} aria-label={`Seek ${track.name}`} aria-valuemin={0} aria-valuemax={duration}
                 aria-valuenow={position} aria-valuetext={`${formatTime(position)} of ${formatTime(duration)}`}
                 onPointerDown={(event) => {
                     if (event.button !== 0) return;
                     event.currentTarget.setPointerCapture(event.pointerId);
                     setScrub(at(event));
                 }}
                 onPointerMove={(event) => {
                     setHover(at(event));
                     if (event.currentTarget.hasPointerCapture(event.pointerId)) setScrub(at(event));
                 }}
                 // Where it's let go, as the last move may not have rendered yet.
                 onPointerUp={(event) => commit(event.currentTarget.hasPointerCapture(event.pointerId) ? at(event) : null)}
                 onPointerCancel={() => setScrub(null)}
                 onPointerLeave={() => setHover(null)}
                 onKeyDown={(event) => {
                     const move = keys[event.key];
                     if (!move) return;
                     event.preventDefault();
                     setScrub((ms) => clamp(move(ms ?? position)));
                 }}
                 onKeyUp={() => commit(scrub)}
                 onBlur={() => commit(scrub)}>
                <div className='waveform-bars' style={{maskImage: bars, '--played': along(position), '--hover': along(hover ?? 0)} as CSSProperties}/>
                <span className='waveform-time'>{formatTime(position)}</span>
                <span className='waveform-time waveform-duration'>{formatTime(duration)}</span>
            </div>
            {comments.filter((comment) => comment.parentID === null).map((comment) =>
                <button key={comment.id} className={`waveform-marker no-outline${comment === bubble ? ' active' : ''}`} style={{left: along(comment.timestamp)}}
                        aria-label={`${comment.authorName} at ${formatTime(comment.timestamp)}`} aria-description={comment.commentBody}
                        onPointerEnter={() => setPeek(comment)} onPointerLeave={() => setPeek(null)}
                        onFocus={() => setPeek(comment)} onBlur={() => setPeek(null)}
                        onClick={() => onShow(comment)}>
                    <Avatar name={comment.authorName} image={comment.authorImage}/>
                </button>)}
        </div>
    );
}
