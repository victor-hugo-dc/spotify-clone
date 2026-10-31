import React, { useState, useEffect} from "react";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";

export default function SocialPage() {
    const [feed,setFeed] = useState<SongComment[]>([]);

    // Newest comments first.
    useEffect(() => {
      fetch("/api/comments/all")
        .then(response => response.json())
        .then((data: { comments: SongComment[] }) => setFeed(data.comments.reverse()))
        .catch((error) => console.log(error))
    },[])

    return (
      <div className="socialPage">
        <PageTitle name="Your Feed" />
        <div className="socialGrid">
          {feed.map(comm => 
            <Comment
            key = {comm._id}
            user = {comm.authorID}
            commentBody = {comm.commentBody}
            timestamp = {comm.timestamp}
            songID = {comm.songID}
            showSong = {true}
            ></Comment>)}
        </div>
      </div>
    );
}
