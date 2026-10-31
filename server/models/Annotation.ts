import mongoose from "mongoose";

const AnnotationSchema = new mongoose.Schema(
  {
    authorID: { type: String, required: true },
    songID: { type: String, required: true },
    annotatedText: String,
    noteBody: String,
    timestamp: Number,
  },
  { collection: "Annotations" },
);

export default mongoose.model("Annotation", AnnotationSchema);
