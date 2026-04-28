import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    // 1. Add 'unique: true' to ensure no two blogs ever share the same URL link
    // 2. Add 'index: true' for high-performance lookups
    link: { type: String, required: true, trim: true, unique: true, index: true }, 
    photo: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isPublished: { type: Boolean, default: true },
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.statics.findOneByLink = function(link) {
  return this.findOne({ link: link, isPublished: true });
};

export const Blog = mongoose.model("Blog", blogSchema);