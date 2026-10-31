import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    authorID: { type: String, required: true },
    songID: { type: String, required: true },
    commentBody: String,
    timestamp: Number,
    likes: Number,
    replies: Number,
    reshares: Number,
  },
  { collection: "Comments" },
);

export default mongoose.model("Comment", CommentSchema);
