import { Blog } from "../models/blogSchema.js";

export const createBlog = async (req, res) => {
  try {
    const { title, subtitle, body, link } = req.body;
    if (!title || !subtitle || !body || !link)
      return res.status(400).json({ message: "All fields are required" });

    if (!req.files)
      return res.status(400).json({ message: "Photo is required" });

    const photoUrl = `/blog_photos/${req.files.photo.name}`;

    const blog = await Blog.create({
      title,
      subtitle,
      body,
      link,
      photo: photoUrl,
      author: req.user?._id || null,
      isPublished: true,
    });

    res.status(201).json({ message: "Blog created successfully", blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    let blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    const { title, subtitle, body, link } = req.body;

    // Keep old photo by default
    let photoUrl = blog.photo;

    // ✅ If a new file was uploaded, use it
    if (req.files && req.files.photo) {
      photoUrl = `/blog_photos/${req.files.photo.name}`;
    }

    blog = await Blog.findByIdAndUpdate(
      id,
      { title, subtitle, body, link, photo: photoUrl },
      { new: true, runValidators: true }
    );

    res.status(200).json({ message: "Blog updated successfully", blog });
  } catch (error) {
    console.error("[UPDATE BLOG ERROR]", error);
    res.status(500).json({ message: error.message });
  }
};


export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ isPublished: true }).sort({ createdAt: -1 });
    res.status(200).json({ blogs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getSingleBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    res.status(200).json({ blog });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });
    await blog.deleteOne();
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const togglePublishStatus = async (req, res) => {
  try {
    let blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.isPublished = !blog.isPublished;
    await blog.save();

    res.status(200).json({
      message: `Blog ${blog.isPublished ? "published" : "unpublished"} successfully`,
      blog,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const likeBlog = async (req, res) => {
  try {
    const { id } = req.params;
    let blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog not found" });

    blog.likes = (blog.likes || 0) + 1;
    await blog.save();

    res.status(200).json({ message: "Blog liked successfully", likes: blog.likes });
  } catch (error) {
    console.error("[LIKE BLOG ERROR]", error);
    res.status(500).json({ message: error.message });
  }
};

