import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import PageBanner, { type BannerInfo } from '../featured-components/PageBanner';
import PromptButton from '../featured-components/PromptButton';
import Comment from '../featured-components/Comment';
import AddComment from '../footer-components/AddComment';
import { spotify } from '../../utilities/spotify';
import { api } from '../../utilities/api';
import useCommentsLoader from '../../utilities/hooks/useCommentsLoader';
import { commentSong, type CommentSong, type SongComment, type Track } from '../../utilities/types';
import '../../styles/pages.css';

export default function CommentPage() {
    const { id = '' } = useParams();
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [song, setSong] = useState<CommentSong | null>(null);
    const [adding, setAdding] = useState(false);

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
        <div className='listPage' style={{display: 'block'}}>
            <PageBanner pageTitle='song' bannerInfo={bannerInfo}/>
            <div className="playListContent" style={{marginLeft: '2em', marginRight: '2em'}}>
                {song && <div style={{padding: '24px 0 8px'}}><PromptButton name='Add a comment' styleName='light' onClick={() => setAdding(true)}/></div>}
                {adding && song && <AddComment closeTip={() => setAdding(false)} song={song}/>}
                {failed && <p className='empty-state' role='alert'>Couldn't load the comments. Try again in a moment.</p>}
                {!failed && feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Be the first!</p>}
                {feed?.map(comm => 
                    <Comment key={comm.id} comment={comm} showSong={false}/>)}
            </div>
        </div>
    );
}
