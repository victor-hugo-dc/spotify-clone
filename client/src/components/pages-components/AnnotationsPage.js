import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import {
  MessageContext,
  SongContext,
  TokenContext,
} from "../../utilities/context";
import requestWithToken from "../../utilities/requestWithToken";
import LyricsContainer from "../featured-components/LyricsContainer";
import AddAnnotation from "../featured-components/AddAnnotation";
import Annotation from "../featured-components/Annotation";
import PageTitle from "../featured-components/PageTitle";

export default function AnnotationsPage() {
  const token = useContext(TokenContext);
  const { song } = useContext(SongContext);
  const setMessage = useContext(MessageContext);
  const [annotatedText, setAnnotatedText] = useState("");
  const [annotationTip, setAnnotationTip] = useState(false);
  const [id, setId] = useState("");
  const [feed, setFeed] = useState([]);
  // const loggedIn = useContext(LoginContext);

  const cancelSource = axios.CancelToken.source();
  useEffect(() => {
    requestWithToken("https://api.spotify.com/v1/me/player/currently-playing", token, cancelSource)
      .then(({ data }) => setId(data.item.id))
      .catch((error) => setMessage(error.message));
    // eslint-disable-next-line
  }, [song, token]);

  const openAnnotationTip = () => {
    if (annotationTip === false) {
      setAnnotationTip(true);
    }
  };

  const setAnnotatedTextCallback = (text) => {
    setAnnotatedText(text);
  };

  useEffect(() => {
    console.log(`/annotations/${id}`);

    if (id.length > 0) {
      axios.get(process.env.REACT_APP_BACK_URI + `/annotations/song/${id}`).then((response) => {
        const data = response.data;
        console.log(data);
        const jsonData = data.f_annotation.map((item) => {
          const stringifiedObjectId = item._id.toString();
          return {
            authorID: item.authorID,
            songID: item.songID,
            noteBody: item.noteBody,
            annotatedText: item.annotatedText,
            timestamp: item.timestamp,
            _id: stringifiedObjectId,
          };
        });
        setFeed(jsonData.reverse());
        console.log(jsonData);
      });
    }
  }, [id]);

  return (
    <div className="annotation-page-content">
      <div className="pageContent lyrics-container">
        <LyricsContainer
          selectionCallback={setAnnotatedTextCallback}
          openTip={openAnnotationTip}
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
            {feed.map((comm) => (
              <Annotation
                key={comm._id}
                user={comm.authorID}
                noteBody={comm.noteBody}
                timestamp={comm.timestamp}
                songID={comm.songID}
                annotatedText={comm.annotatedText}
              ></Annotation>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
