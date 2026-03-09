import mongoose from "mongoose";

const blogCommentSchema = new mongoose.Schema(
  {
    blog: { type: mongoose.Schema.Types.ObjectId, ref: "Blog", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional
    name: { type: String }, // name for anonymous comments
    comment: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

export const BlogComment = mongoose.model("BlogComment", blogCommentSchema);
