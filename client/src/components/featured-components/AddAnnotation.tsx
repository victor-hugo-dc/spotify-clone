import React from "react";
import AddComment from "../footer-components/AddComment";

type Props = { closeTip: () => void; annotatedText: string };

const AddAnnotation = ({ closeTip, annotatedText }: Props) => {
  return (
    <div className="add-annotation" data-source="inside">
      <AddComment
        closeTip={closeTip}
        annotation={true}
        text={annotatedText}
      />
    </div>
  );
};

export default AddAnnotation;
