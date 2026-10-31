import React from "react";
import AddComment from "../footer-components/AddComment";

type Props = { closeTip: () => void; token: string | null; annotatedText: string };

const AddAnnotation = ({ closeTip, token, annotatedText }: Props) => {
  return (
    <div className="add-annotation" data-source="inside">
      <AddComment
        closeTip={closeTip}
        token={token}
        annotation={true}
        text={annotatedText}
      />
    </div>
  );
};

export default AddAnnotation;
