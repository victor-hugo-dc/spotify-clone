import React, { useState, useEffect, useContext } from "react";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";
import { TokenContext } from "../../utilities/context";
import { api } from "../../utilities/api";

export default function SocialPage() {
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const token = useContext(TokenContext);

    // Newest comments first.
    useEffect(() => {
      api<{ comments: SongComment[] }>("/comments/all", token)
        .then((data) => setFeed(data.comments.reverse()))
        .catch((error) => console.log(error))
    },[token])

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
