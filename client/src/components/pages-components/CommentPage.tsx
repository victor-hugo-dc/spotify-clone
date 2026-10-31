import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import PageBanner, { type BannerInfo } from '../featured-components/PageBanner';
import Comment from '../featured-components/Comment';
import { TokenContext } from '../../utilities/context';
import { spotify } from '../../utilities/spotify';
import type { SongComment, Track } from '../../utilities/types';

export default function CommentPage() {
    const { id = '' } = useParams();
    const token = useContext(TokenContext);
    const [feed,setFeed] = useState<SongComment[]>([]);
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
        fetch(`/api/comments/song/${id}`)
            .then(response => response.json())
            .then((data: { comments: SongComment[] }) => setFeed(data.comments.sort((a, b) => a.timestamp - b.timestamp)))
            .catch((error) => console.log(error))
      },[id])
    

    return (
        <div className='listPage' style={{display: 'block'}}>
            <PageBanner pageTitle={albumType} bannerInfo={bannerInfo}/>
            <div className="playListContent" style={{marginLeft: '2em', marginRight: '2em'}}>
                {feed.map(comm => 
                    <Comment
                        key = {comm._id}
                        user = {comm.authorID}
                        commentBody = {comm.commentBody}
                        timestamp = {comm.timestamp}
                        songID = {comm.songID}
                        showSong = {false}
                    ></Comment>)}
            </div>
        </div>
    );
}
