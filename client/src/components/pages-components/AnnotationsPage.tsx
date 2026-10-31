import React, { useContext, useEffect, useState } from "react";
import { MessageContext } from "../../utilities/context";
import { spotify } from "../../utilities/spotify";
import { api } from "../../utilities/api";
import useCommentsLoader from "../../utilities/hooks/useCommentsLoader";
import LyricsContainer from "../featured-components/LyricsContainer";
import AddAnnotation from "../featured-components/AddAnnotation";
import Annotation from "../featured-components/Annotation";
import PageTitle from "../featured-components/PageTitle";
import { commentSong, type CommentSong, type SongAnnotation, type Track } from "../../utilities/types";
import "../../styles/pages.css";

export default function AnnotationsPage() {
  const setMessage = useContext(MessageContext);
  const [annotatedText, setAnnotatedText] = useState("");
  const [annotationTip, setAnnotationTip] = useState(false);
  // The song this page is about: what was playing when it opened. New annotations go to it, not to whatever plays later.
  const [song, setSong] = useState<CommentSong | null>(null);
  const [feed, setFeed] = useState<SongAnnotation[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    spotify<{ progress_ms: number; item: Track | null } | undefined>("/me/player/currently-playing", { signal: controller.signal })
      .then((playing) => {
        const item = playing?.item;
        if (!item) setMessage("Play a song to see and add its annotations");
        // Local files have no Spotify id to attach annotations to.
        else if (!item.id) setMessage("Local files can't be annotated");
        else setSong(commentSong(item, playing.progress_ms));
      })
      .catch((error) => setMessage(error.message));
    return () => controller.abort();
    // eslint-disable-next-line
  }, []);

  // Newest annotations first.
  useCommentsLoader(() => {
    if (!song) return;
    api<{ annotations: SongAnnotation[] }>(`/annotations/song/${song.id}`)
      .then((data) => {
        setFeed(data.annotations.reverse());
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [song?.id]);

  return (
    <div className="annotation-page-content">
      <div className="pageContent lyrics-container">
        <LyricsContainer
          selectionCallback={setAnnotatedText}
          openTip={() => setAnnotationTip(song !== null)}
        />
        <span className="annotation-wrapper">
          {annotationTip && song && (
            <AddAnnotation
              closeTip={() => setAnnotationTip(false)}
              annotatedText={annotatedText}
              song={song}
            />
          )}
        </span>
      </div>
      <div className="lyrics-container">
        <div className="socialPage">
          <PageTitle name={song ? `Annotations · ${song.name}` : "Annotations"} />
          <div className="socialGrid">
            {failed && <p className='empty-state' role='alert'>Couldn't load the annotations. Try again in a moment.</p>}
            {!failed && feed?.length === 0 && <p className='empty-state'>No one has annotated this song yet.</p>}
            {feed?.map((comm) => (
              <Annotation key={comm.id} annotation={comm} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
