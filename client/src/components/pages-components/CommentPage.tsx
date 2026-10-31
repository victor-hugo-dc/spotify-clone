import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import PageBanner, { type BannerInfo } from '../featured-components/PageBanner';
import Comment from '../featured-components/Comment';
import { TokenContext } from '../../utilities/context';
import { spotify } from '../../utilities/spotify';
import { api } from '../../utilities/api';
import type { SongComment, Track } from '../../utilities/types';

export default function CommentPage() {
    const { id = '' } = useParams();
    const token = useContext(TokenContext);
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [albumType, setAlbumType] = useState('');

    const [bannerInfo, setbannerInfo] = useState<BannerInfo>({
        name: '',
        user: [],
        primary_color: '#262626',
    })

    useEffect(() => {
        const controller = new AbortController();
        spotify<Track>(`/tracks/${id}`, token, { signal: controller.signal })
            .then(({album, name, artists}) => {
                if (album) {
                    setAlbumType(album.album_type)
                    setbannerInfo({
                        name: name,
                        user: artists,
                        primary_color: '#262626',
                        images: album.images,
                        release_date: album.release_date
                    })
                }
            })
            .catch((error) => console.log(error))
        return () => controller.abort()
    }, [id, token])

    // In song order.
    useEffect(() => {
        api<{ comments: SongComment[] }>(`/comments/song/${id}`)
            .then((data) => setFeed(data.comments.sort((a, b) => a.timestamp - b.timestamp)))
            .catch((error) => console.log(error))
      },[id])
    

    return (
        <div className='listPage' style={{display: 'block'}}>
            <PageBanner pageTitle={albumType} bannerInfo={bannerInfo}/>
            <div className="playListContent" style={{marginLeft: '2em', marginRight: '2em'}}>
                {feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Play the song and hit the comment button to be the first.</p>}
                {feed?.map(comm => 
                    <Comment key={comm.id} comment={comm} showSong={false}/>)}
            </div>
        </div>
    );
}
