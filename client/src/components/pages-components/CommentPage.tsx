import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import PageBanner, { type BannerInfo } from '../featured-components/PageBanner';
import Comment from '../featured-components/Comment';
import AddComment from '../footer-components/AddComment';
import Icon from '../icons';
import { spotify } from '../../utilities/spotify';
import { api } from '../../utilities/api';
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader';
import usePlayback from '../../utilities/hooks/usePlayback';
import { commentSong, type CommentSong, type SongComment, type Track } from '../../utilities/types';
import '../../styles/pages.css';

export default function CommentPage() {
    const { id = '' } = useParams();
    const {isPlaying, toggle} = usePlayback();
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [song, setSong] = useState<CommentSong | null>(null);
    const [adding, setAdding] = useState(false);
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
                    primary_color: '#262626',
                    images: track.album?.images,
                    release_date: track.album?.release_date,
                })
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [id])

    // In song order.
    useCommentsLoader(() => {
        api<{ comments: SongComment[] }>(`/comments/song/${id}`)
            .then((data) => {
                setFeed(data.comments.sort((a, b) => a.timestamp - b.timestamp));
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
                        <button className='page-pill no-outline' onClick={() => setAdding(true)}>Add a comment</button>
                    </div>
                }
                {adding && song && <AddComment closeTip={() => setAdding(false)} song={song}/>}
                {failed && <p className='empty-state' role='alert'>Couldn't load the comments. Try again in a moment.</p>}
                {!failed && feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Be the first!</p>}
                <div className='comment-list'>
                    {feed?.map(comm =>
                        <Comment key={comm.id} comment={comm} showSong={false}/>)}
                </div>
            </div>
        </div>
    );
}
