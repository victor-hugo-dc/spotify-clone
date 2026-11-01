import React, { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useParams } from 'react-router';
import PageBanner, { type BannerInfo } from '../featured-components/PageBanner';
import Comment, { Avatar } from '../featured-components/Comment';
import Icon from '../icons';
import { spotify } from '../../utilities/spotify';
import { api } from '../../utilities/api';
import formatTime, { parseTime, positionAt } from '../../utilities/time';
import useCommentsLoader, { commentsChanged } from '../../utilities/hooks/useCommentsLoader';
import usePlayback from '../../utilities/hooks/usePlayback';
import { MessageContext, SeekContext, UserContext, usePlaybackClock } from '../../utilities/context';
import { commentSong, type CommentSong, type SongComment, type Track } from '../../utilities/types';
import '../../styles/pages.css';

export default function CommentPage() {
    const { id = '' } = useParams();
    const {isPlaying, toggle} = usePlayback();
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [song, setSong] = useState<CommentSong | null>(null);
    const uri = `spotify:track:${id}`;
    const playing = isPlaying(uri);

    const [bannerInfo, setbannerInfo] = useState<BannerInfo>({
        name: '',
        user: [],
        primary_color: '#262626',
    })

    useEffect(() => {
        setSong(null);
        const controller = new AbortController();
        spotify<Track>(`/tracks/${id}`, { signal: controller.signal })
            .then((track) => {
                setSong(commentSong(track));
                setbannerInfo({
                    name: track.name,
                    user: track.artists,
                    images: track.album?.images,
                    release_date: track.album?.release_date,
                })
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [id])

    // Newest first; the server sends them oldest first.
    useCommentsLoader(() => {
        api<{ comments: SongComment[] }>(`/comments/song/${id}`)
            .then((data) => {
                setFeed(data.comments.reverse());
                setFailed(false);
            })
            .catch(() => setFailed(true))
    }, [id])

    return (
        <div className='listPage'>
            <PageBanner pageTitle='song' bannerInfo={bannerInfo}/>
            <div className="playListContent comments-content">
                {song &&
                    <div className='comments-actions'>
                        <button className='comments-play no-outline' title={playing ? 'Pause' : 'Play'} aria-label={`${playing ? 'Pause' : 'Play'} ${song.name}`}
                                onClick={() => toggle(uri, {uris: [uri]})}>
                            <Icon name={playing ? 'Pause' : 'Play'} width='24' height='24'/>
                        </button>
                    </div>
                }
                {/* Like a Twitter timeline: the composer, then the comments. */}
                <section className='timeline' aria-label='Comments'>
                    {song?.id === id && <Composer song={song}/>}
                    {failed && <p className='empty-state' role='alert'>Couldn't load the comments. Try again in a moment.</p>}
                    {!failed && feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Be the first!</p>}
                    {feed?.map(comm =>
                        <Comment key={comm.id} comment={comm} showSong={false}/>)}
                </section>
            </div>
        </div>
    );
}

// Writing a comment, by your picture. The green chip at the start of the text is the moment in the song it's about: it
// follows playback while this song is loaded and nothing is written; focusing, typing or setting it pins it there, and
// setting it moves playback there too.
function Composer({song}: {song: CommentSong}) {
    const me = useContext(UserContext);
    const setMessage = useContext(MessageContext);
    const clock = usePlaybackClock();
    const seek = useContext(SeekContext);
    const live = clock.uri === `spotify:track:${song.id}`;
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    // Where the chip is pinned; null while it follows playback, or sits at 0:00 while another song is loaded.
    const [pinned, setPinned] = useState<number | null>(null);
    const [now, setNow] = useState(Date.now);
    const time = pinned ?? (live ? positionAt(clock, now) : 0);
    // The chip's text while it's edited, and whether the time last entered there was turned down.
    const [draft, setDraft] = useState<string | null>(null);
    const [invalid, setInvalid] = useState(false);
    const [indent, setIndent] = useState(0);
    const box = useRef<HTMLTextAreaElement>(null);
    const chip = useRef<HTMLButtonElement>(null);
    const chipSpace = useRef<HTMLSpanElement>(null);
    const { key, state } = useLocation();

    // The chip moves on twice a second while it follows music that plays.
    const following = pinned === null && live && clock.play;
    useEffect(() => {
        if (!following) return;
        const tick = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(tick);
    }, [following]);

    // The Comment buttons (useWriteComment) come here to write, also when it's already open.
    useEffect(() => {
        if (state?.compose) box.current?.focus();
        // eslint-disable-next-line
    }, [key]);

    // The first line starts after the chip, which widens with its time and while it's edited.
    useLayoutEffect(() => {
        const space = chipSpace.current!;
        const measure = () => setIndent(space.offsetWidth);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(space);
        return () => observer.disconnect();
    }, []);

    const pin = () => setPinned((pinned) => pinned ?? time);

    const edit = () => {
        pin();
        setDraft(formatTime(time));
    };

    // Back to the chip; to its button too when the editor was left from the keyboard. Synchronous, so the button is
    // there to focus.
    const close = (refocus: boolean) => {
        flushSync(() => {
            setDraft(null);
            setInvalid(false);
        });
        if (refocus) chip.current?.focus();
    };

    // A time in the song pins the chip there and, while the song is loaded, moves playback there. Anything else stays
    // in the editor, to be fixed.
    const commit = (refocus: boolean) => {
        if (draft === null) return;
        const ms = parseTime(draft, song.duration);
        if (ms === null) return setInvalid(true);
        if (formatTime(ms) !== formatTime(time)) {
            setPinned(ms);
            if (live) seek(ms);
        }
        close(refocus);
    };

    const ready = text.trim() !== '' && !saving && !invalid;
    // On this page's song at the chip's time, whatever plays by then. What's written stays until the server has it.
    const post = () => {
        if (!ready) return;
        setSaving(true);
        api('/comments/add', {songID: song.id, songName: song.name, songArtist: song.artist, songImage: song.image, commentBody: text, timestamp: time})
            .then(() => {
                setText('');
                setPinned(null);
                commentsChanged();
            }, (error) => setMessage(`ERROR: could not save it (${error.message})`))
            .finally(() => setSaving(false));
    };

    return (
        <div className='composer'>
            <Avatar name={me?.display_name ?? me?.id ?? ''} image={me?.images?.[0]?.url ?? null}/>
            <div className='composer-main'>
                <div className='composer-field' data-text={text} style={{'--indent': `${indent}px`} as CSSProperties}>
                    <span className='time-chip-space' ref={chipSpace}>
                        {draft === null ?
                            <button ref={chip} className='time-chip no-outline' title='Change the moment this comment is about'
                                    aria-label={`Comment timestamp ${formatTime(time)}`} onClick={edit}>{formatTime(time)}</button> :
                            <input className='time-chip' autoFocus aria-label='Comment timestamp' aria-invalid={invalid}
                                   style={{width: `calc(${Math.max(draft.length, 1)}ch + 16px)`}} value={draft}
                                   onFocus={(event) => event.target.select()}
                                   onChange={(event) => {
                                       setDraft(event.target.value);
                                       setInvalid(false);
                                   }}
                                   onKeyDown={(event) => {
                                       if (event.key === 'Escape') close(true);
                                       if (event.key !== 'Enter') return;
                                       // Kept from the button the chip turns back into, which would take it as a click.
                                       event.preventDefault();
                                       commit(true);
                                   }}
                                   onBlur={() => commit(false)}/>}
                    </span>
                    {/* The server takes up to 2000 characters, and not just whitespace. */}
                    <textarea ref={box} className='composer-text' rows={1} maxLength={2000} placeholder='Add a comment…' aria-label='Comment'
                              readOnly={saving} value={text}
                              onFocus={pin}
                              onChange={(event) => {
                                  setText(event.target.value);
                                  pin();
                              }}
                              onKeyDown={(event) => {
                                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) post();
                              }}/>
                </div>
                {invalid && <p className='time-chip-error' role='alert'>Enter a time from 0:00 to {formatTime(song.duration)}</p>}
                <div className='composer-actions'>
                    <button className='composer-post no-outline' disabled={!ready} onClick={post}>Post</button>
                </div>
            </div>
        </div>
    );
}
