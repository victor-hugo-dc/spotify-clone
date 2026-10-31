import React, { useState, useEffect } from "react";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";
import { api } from "../../utilities/api";

export default function SocialPage() {
    const [feed,setFeed] = useState<SongComment[] | null>(null);

    // The server sends the newest 100, newest first.
    useEffect(() => {
      api<{ comments: SongComment[] }>("/comments/all")
        .then((data) => setFeed(data.comments))
        .catch((error) => console.log(error))
    },[])

    return (
      <div className="socialPage">
        <PageTitle name="Your Feed" />
        <div className="socialGrid">
          {feed?.length === 0 && <p className='empty-state'>No one's commented thus far. Play a song and hit the comment button to start the conversation.</p>}
          {feed?.map(comm => 
            <Comment key={comm.id} comment={comm} showSong={true}/>)}
        </div>
      </div>
    );
}
