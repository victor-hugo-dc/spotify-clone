import React, { useEffect, useContext, useState } from "react";

import { MessageContext } from "../../utilities/context";
import { spotify } from "../../utilities/spotify";
import { api } from "../../utilities/api";
import type { Track } from "../../utilities/types";

type Props = { closeTip: () => void; token: string | null; annotation?: boolean; text?: string };

const AddComment = ({ closeTip, token, annotation = false, text = ''}: Props) => {
	const [songInfo, setSongInfo] = useState({
		songId: "",
		timestamp: 0
	});
	const setMessage = useContext(MessageContext);
	const [commenttext, setCommentText] = useState("");
	
	/*
	 * Get the song that's currently playing. The server works out who is commenting from the token.
	 */
	useEffect(() => {
		const controller = new AbortController();

		spotify<{ progress_ms: number; item: Track | null } | undefined>("/me/player/currently-playing", token, { signal: controller.signal })
			.then((playing) => playing?.item && setSongInfo({ songId: playing.item.id, timestamp: playing.progress_ms }))
			.catch((error) => console.log(error));

		return () => controller.abort();
	}, [token]);

	const save = (path: string, data: object, done: string) => {
		api(path, token, data)
			.then(() => setMessage(done))
			.catch((error) => setMessage(`ERROR: could not save it (${error.message})`));
		closeTip();
	}

	const handleCommentSubmit = () => {
		save("/comments/add", {
			songID: songInfo.songId,
			commentBody: commenttext,
			timestamp: songInfo.timestamp,
		}, "Comment Added!");
	}

	// Special callback to handle annotation submission
	const handleAnnotationSubmit = () => {
		save("/annotations/add", {
			songID: songInfo.songId,
			annotatedText: text,
			noteBody: commenttext,
			timestamp: songInfo.timestamp
		}, "Annotation Added!");
	}


	return (
		<div className="add-comment" data-source="inside">
			<div className="add-comment-content" data-source="inside">
				<div className="add-comment-title" data-source="inside">
					<h1 data-source="inside">Add Comment</h1>
				</div>
				<div className="commentdiv" data-source="inside">
					<textarea className="textareacomment" name="freeform" rows={5} cols={43} onChange={(event) => setCommentText(event.target.value)}></textarea>
				</div>
				<button className="pill-button-grey" onClick={closeTip}>Cancel</button>
				<button className="pill-button-green" onClick={annotation ? handleAnnotationSubmit : handleCommentSubmit}>Add</button>
			</div>
		</div>
	);
};

export default AddComment;
