import React, { useState } from "react";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";
import { api } from "../../utilities/api";
import useCommentsLoader from "../../utilities/hooks/useCommentsLoader";
import "../../styles/pages.css";

export default function SocialPage() {
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);

    // The server sends the newest 100, newest first.
    useCommentsLoader(() => {
      api<{ comments: SongComment[] }>("/comments/all")
        .then((data) => {
          setFeed(data.comments)
          setFailed(false)
        })
        .catch(() => setFailed(true))
    }, [])

    return (
      <div className="socialPage">
        <PageTitle name="Your Feed" />
        <div className="socialGrid">
          {failed && <p className='empty-state' role='alert'>Couldn't load the feed. Try again in a moment.</p>}
          {!failed && feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Play a song and hit the comment button to start the conversation.</p>}
          {feed?.map(comm => 
            <Comment key={comm.id} comment={comm} showSong={true}/>)}
        </div>
      </div>
    );
}
