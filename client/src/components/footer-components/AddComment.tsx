import React, { useEffect, useContext, useState } from "react";

import { MessageContext } from "../../utilities/context";
import { spotify } from "../../utilities/spotify";
import { api } from "../../utilities/api";
import type { Track } from "../../utilities/types";

type Props = { closeTip: () => void; annotation?: boolean; text?: string };

const AddComment = ({ closeTip, annotation = false, text = ''}: Props) => {
	const [songInfo, setSongInfo] = useState({
		songId: "",
		timestamp: 0
	});
	const setMessage = useContext(MessageContext);
	const [commenttext, setCommentText] = useState("");
	const [saving, setSaving] = useState(false);

	/*
	 * Get the song that's currently playing. The server knows who is commenting from the login cookie.
	 */
	useEffect(() => {
		const controller = new AbortController();

		spotify<{ progress_ms: number; item: Track | null } | undefined>("/me/player/currently-playing", { signal: controller.signal })
			.then((playing) => playing?.item && setSongInfo({ songId: playing.item.id, timestamp: playing.progress_ms }))
			.catch((error) => console.log(error));

		return () => controller.abort();
	}, []);

	// The dialog, and what was typed into it, stay until the server has it.
	const save = (path: string, data: object, done: string) => {
		setSaving(true);
		api(path, data)
			.then(() => {
				setMessage(done);
				closeTip();
			})
			.catch((error) => {
				setMessage(`ERROR: could not save it (${error.message})`);
				setSaving(false);
			});
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

	const title = annotation ? "Add Annotation" : "Add Comment";

	return (
		<div className="add-comment" data-source="inside" role="dialog" aria-label={title}>
			<div className="add-comment-content" data-source="inside">
				<div className="add-comment-title" data-source="inside">
					<h1 data-source="inside">{title}</h1>
				</div>
				<div className="commentdiv" data-source="inside">
					{/* The server takes up to 2000 characters, and not just whitespace. */}
					<textarea className="textareacomment" name="freeform" rows={5} cols={43} maxLength={2000} autoFocus aria-label={annotation ? "Annotation" : "Comment"} value={commenttext} onChange={(event) => setCommentText(event.target.value)}></textarea>
				</div>
				<button className="pill-button-grey" onClick={closeTip}>Cancel</button>
				<button className="pill-button-green" disabled={saving || !songInfo.songId || commenttext.trim() === ""} onClick={annotation ? handleAnnotationSubmit : handleCommentSubmit}>Add</button>
			</div>
		</div>
	);
};

export default AddComment;
