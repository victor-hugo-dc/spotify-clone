import React, { useContext, useEffect, useState } from "react";
import { MessageContext, TokenContext } from "../../utilities/context";
import { spotify } from "../../utilities/spotify";
import { api } from "../../utilities/api";
import LyricsContainer from "../featured-components/LyricsContainer";
import AddAnnotation from "../featured-components/AddAnnotation";
import Annotation from "../featured-components/Annotation";
import PageTitle from "../featured-components/PageTitle";
import type { SongAnnotation, Track } from "../../utilities/types";

export default function AnnotationsPage() {
  const token = useContext(TokenContext);
  const setMessage = useContext(MessageContext);
  const [annotatedText, setAnnotatedText] = useState("");
  const [annotationTip, setAnnotationTip] = useState(false);
  const [id, setId] = useState("");
  const [feed, setFeed] = useState<SongAnnotation[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    spotify<{ item: Track | null } | undefined>("/me/player/currently-playing", token, { signal: controller.signal })
      .then((playing) => playing?.item ? setId(playing.item.id) : setMessage("Play a song to see and add its annotations"))
      .catch((error) => setMessage(error.message));
    return () => controller.abort();
    // eslint-disable-next-line
  }, [token]);

  // Newest annotations first.
  useEffect(() => {
    if (id.length > 0) {
      api<{ annotations: SongAnnotation[] }>(`/annotations/song/${id}`)
        .then((data) => setFeed(data.annotations.reverse()))
        .catch((error) => console.log(error));
    }
  }, [id]);

  return (
    <div className="annotation-page-content">
      <div className="pageContent lyrics-container">
        <LyricsContainer
          selectionCallback={setAnnotatedText}
          openTip={() => setAnnotationTip(true)}
        />
        <span className="annotation-wrapper">
          {annotationTip && (
            <AddAnnotation
              closeTip={() => setAnnotationTip(false)}
              token={token}
              annotatedText={annotatedText}
            />
          )}
        </span>
      </div>
      <div className="lyrics-container">
        <div className="socialPage">
          <PageTitle name="Comments" />
          <div className="socialGrid">
            {feed?.length === 0 && <p className='empty-state'>No one has annotated this song yet.</p>}
            {feed?.map((comm) => (
              <Annotation key={comm.id} annotation={comm} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
