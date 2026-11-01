import React, { useState } from "react";
import { useNavigate } from "react-router";
import PageTitle from "../featured-components/PageTitle";
import Comment from "../featured-components/Comment";
import type { SongComment } from "../../utilities/types";
import { api } from "../../utilities/api";
import useCommentsLoader from "../../utilities/hooks/useCommentsLoader";
import "../../styles/pages.css";

// The two comment feeds, newest first: Social (in Your Library), by the people you follow on Spotify; What's New (the
// top bar's bell), by everyone on this Shoutify.
const feeds = {
  social: {
    path: "/comments/feed",
    title: "Social",
    subtitle: "The latest comments from the people you follow on Spotify.",
    empty: "When people you follow on Spotify comment on Shoutify, their comments show up here.",
  },
  "whats-new": {
    path: "/comments/all",
    title: "What's New",
    subtitle: "The latest comments from you and your friends.",
    empty: "No one's commented thus far. Play a song and hit the comment button to start the conversation.",
  },
};

export default function SocialPage({ kind }: { kind: keyof typeof feeds }) {
    const { path, title, subtitle, empty } = feeds[kind];
    const [feed,setFeed] = useState<SongComment[] | null>(null);
    const [failed, setFailed] = useState(false);
    const navigate = useNavigate();

    // The server sends the newest 100, newest first.
    useCommentsLoader(() => {
      api<{ comments: SongComment[] }>(path)
        .then((data) => {
          setFeed(data.comments)
          setFailed(false)
        })
        .catch(() => setFailed(true))
    }, [])

    return (
      <div className="socialPage">
        <PageTitle name={title} />
        <p className="page-subtitle">{subtitle}</p>
        <div className="socialGrid">
          {failed && <p className='empty-state' role='alert'>Couldn't load the feed. Try again in a moment.</p>}
          {!failed && feed?.length === 0 && <p className='empty-state'>{empty}</p>}
          {/* Reply goes to the song's page, where the thread is, with that comment's reply composer open. */}
          {feed?.map(comm =>
            <Comment key={comm.id} comment={comm} showSong={true} onReply={() => navigate(`/comments/${comm.songID}`, {state: {reply: comm.id}})}/>)}
        </div>
      </div>
    );
}
