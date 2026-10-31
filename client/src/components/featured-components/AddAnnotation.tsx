import React from "react";
import AddComment from "../footer-components/AddComment";
import type { CommentSong } from "../../utilities/types";

type Props = { closeTip: () => void; annotatedText: string; song: CommentSong };

const AddAnnotation = ({ closeTip, annotatedText, song }: Props) => {
  return (
    <div className="add-annotation" data-source="inside">
      <AddComment
        closeTip={closeTip}
        song={song}
        annotation={true}
        text={annotatedText}
      />
    </div>
  );
};

export default AddAnnotation;
