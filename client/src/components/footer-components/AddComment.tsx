import React, { useContext, useState } from "react";

import { MessageContext } from "../../utilities/context";
import { api } from "../../utilities/api";
import { commentsChanged } from "../../utilities/hooks/useCommentsLoader";
import formatTime from "../../utilities/time";
import type { CommentSong } from "../../utilities/types";

type Props = { closeTip: () => void; song: CommentSong; text: string };

// The annotations page's dialog (comments are written on the song's comment page).
const AddComment = ({ closeTip, song: songNow, text }: Props) => {
	const setMessage = useContext(MessageContext);
	const [commenttext, setCommentText] = useState("");
	const [saving, setSaving] = useState(false);
	// The song the comment is about, and the moment in it: as they were when the dialog opened.
	const [song] = useState(songNow);

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

	const handleAnnotationSubmit = () => {
		save("/annotations/add", {
			songID: song.id,
			annotatedText: text,
			noteBody: commenttext,
			timestamp: song.position,
		}, "Annotation Added!");
	}

	const title = "Add Annotation";

	return (
		<div className="add-comment" data-source="inside" role="dialog" aria-label={title}>
			<div className="add-comment-content" data-source="inside">
				<div className="add-comment-title" data-source="inside">
					<h1 data-source="inside">{title}</h1>
					<p className="add-comment-song">{song.name} · {formatTime(song.position)}</p>
				</div>
				<div className="commentdiv" data-source="inside">
					{/* The server takes up to 2000 characters, and not just whitespace. */}
					<textarea className="textareacomment" name="freeform" rows={5} cols={43} maxLength={2000} autoFocus aria-label="Annotation" value={commenttext} onChange={(event) => setCommentText(event.target.value)}></textarea>
				</div>
				<button className="pill-button-grey" onClick={closeTip}>Cancel</button>
				<button className="pill-button-green" disabled={saving || commenttext.trim() === ""} onClick={handleAnnotationSubmit}>Add</button>
			</div>
		</div>
	);
};

export default AddComment;
