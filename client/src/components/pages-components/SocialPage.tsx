import React, { useState } from "react";
import { useNavigate } from "react-router";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";
import { api } from "../../utilities/api";
import useCommentsLoader from "../../utilities/hooks/useCommentsLoader";
import "../../styles/pages.css";

// Social (in Your Library): the comments of the people you follow on Spotify, newest first.
export default function SocialPage() {
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);
    const navigate = useNavigate();

    // The server sends the newest 100, newest first.
    useCommentsLoader(() => {
      api<{ comments: SongComment[] }>("/comments/feed")
        .then((data) => {
          setFeed(data.comments)
          setFailed(false)
        })
        .catch(() => setFailed(true))
    }, [])

    return (
      <div className="socialPage">
        <PageTitle name="Social" />
        <p className="page-subtitle">The latest comments from the people you follow on Spotify.</p>
        <div className="socialGrid">
          {failed && <p className='empty-state' role='alert'>Couldn't load the feed. Try again in a moment.</p>}
          {!failed && feed?.length === 0 && <p className='empty-state'>When people you follow on Spotify comment on Shoutify, their comments show up here.</p>}
          {/* Reply goes to the song's page, where the thread is, with that comment's reply composer open. */}
          {feed?.map(comm =>
            <Comment key={comm.id} comment={comm} showSong={true} onReply={() => navigate(`/comments/${comm.songID}`, {state: {reply: comm.id}})}/>)}
        </div>
      </div>
    );
}
