import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    link: { type: String, required: true, trim: true },
    photo: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: true },
    likes: { type: Number, default: 0 }, // ✅ NEW FIELD
  },
  { timestamps: true }
);

export const Blog = mongoose.model("Blog", blogSchema);
