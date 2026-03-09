import { BlogComment } from "../models/blogComment.js";
import { Blog } from "../models/blogSchema.js"; // ✅ Make sure to import Blog

// Add a comment to a blog (anonymous or logged-in)
export const addComment = async (req, res) => {
  try {
    const { comment, name } = req.body; // optional name for anonymous
    const blogId = req.params.id;

    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Comment cannot be empty" });
    }

    // Check if blog exists
    const blogExists = await Blog.findById(blogId);
    if (!blogExists) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // Create comment
    const newComment = await BlogComment.create({
      blog: blogId,
      comment,
      user: req.user?._id || undefined, // optional if user logged in
      name: req.user?.name || name || "User", // fallback name
    });

    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ error: "Server error while adding comment" });
  }
};

// Get all comments for a blog
export const getComments = async (req, res) => {
  try {
    const blogId = req.params.id;

    const comments = await BlogComment.find({ blog: blogId })
      .populate("user", "name") // if user exists
      .sort({ createdAt: -1 }); // latest first

    res.json({ success: true, comments });
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ error: "Server error while fetching comments" });
  }
};
