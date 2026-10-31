import React, { useContext, useState } from "react";

import { MessageContext } from "../../utilities/context";
import { api } from "../../utilities/api";
import { commentsChanged } from "../../utilities/hooks/useCommentsLoader";
import formatTime from "../../utilities/time";
import type { CommentSong } from "../../utilities/types";

type Props = { closeTip: () => void; song: CommentSong; annotation?: boolean; text?: string };

const AddComment = ({ closeTip, song, annotation = false, text = ''}: Props) => {
	const setMessage = useContext(MessageContext);
	const [commenttext, setCommentText] = useState("");
	const [saving, setSaving] = useState(false);
	// The moment in the song the comment is about: where it was when the dialog opened.
	const [position] = useState(song.position);

	// The dialog, and what was typed into it, stay until the server has it.
	const save = (path: string, data: object, done: string) => {
		setSaving(true);
		api(path, data)
			.then(() => {
				setMessage(done);
				commentsChanged();
				closeTip();
			})
			.catch((error) => {
				setMessage(`ERROR: could not save it (${error.message})`);
				setSaving(false);
			});
	}

	const handleCommentSubmit = () => {
		save("/comments/add", {
			songID: song.id,
			songName: song.name,
			songArtist: song.artist,
			songImage: song.image,
			commentBody: commenttext,
			timestamp: position,
		}, "Comment Added!");
	}

	// Special callback to handle annotation submission
	const handleAnnotationSubmit = () => {
		save("/annotations/add", {
			songID: song.id,
			annotatedText: text,
			noteBody: commenttext,
			timestamp: position,
		}, "Annotation Added!");
	}

	const title = annotation ? "Add Annotation" : "Add Comment";

	return (
		<div className="add-comment" data-source="inside" role="dialog" aria-label={title}>
			<div className="add-comment-content" data-source="inside">
				<div className="add-comment-title" data-source="inside">
					<h1 data-source="inside">{title}</h1>
					<p className="add-comment-song">{song.name} · {formatTime(position)}</p>
				</div>
				<div className="commentdiv" data-source="inside">
					{/* The server takes up to 2000 characters, and not just whitespace. */}
					<textarea className="textareacomment" name="freeform" rows={5} cols={43} maxLength={2000} autoFocus aria-label={annotation ? "Annotation" : "Comment"} value={commenttext} onChange={(event) => setCommentText(event.target.value)}></textarea>
				</div>
				<button className="pill-button-grey" onClick={closeTip}>Cancel</button>
				<button className="pill-button-green" disabled={saving || commenttext.trim() === ""} onClick={annotation ? handleAnnotationSubmit : handleCommentSubmit}>Add</button>
			</div>
		</div>
	);
};

export default AddComment;
