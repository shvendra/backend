import { Blog } from "../models/blogSchema.js";
import uploadToS3 from "../utils/s3.js";

export const createBlog = async (req, res) => {
  try {
    const { title, subtitle, body, link } = req.body;

    // ✅ Validate fields
    if (!title || !subtitle || !body || !link) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // ✅ Validate file
    if (!req.files || !req.files.photo) {
      return res.status(400).json({
        success: false,
        message: "Photo is required",
      });
    }

    const file = req.files.photo;

    // ✅ Clean filename (important)
    const cleanName = file.name.replace(/\s+/g, "_");

    const key = `blog_photos/${Date.now()}_${cleanName}`;

    // ✅ Upload to S3
    const result = await uploadToS3(
      file.data,
      key,
      file.mimetype
    );

    // 🔥 IMPORTANT FIX HERE
    const photoUrl = result.Location; // ✅ MUST BE STRING

    // Debug (optional)
    console.log("S3 Upload Result:", result);
    console.log("Photo URL:", photoUrl);

    // ✅ Save to DB
    const blog = await Blog.create({
      title,
      subtitle,
      body,
      link,
      photo: photoUrl, // ✅ string
      isPublished: true,
    });

    return res.status(201).json({
      success: true,
      message: "Blog created successfully",
      blog,
    });

  } catch (error) {
    console.error("CREATE BLOG ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
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
    const { page, limit } = req.query;

    // Old flow: if page/limit not provided, return all blogs
    if (!page && !limit) {
      const blogs = await Blog.find().sort({ createdAt: -1 });
      return res.status(200).json({ blogs });
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (currentPage - 1) * perPage;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find().sort({ createdAt: -1 }).skip(skip).limit(perPage),
      Blog.countDocuments(),
    ]);

    return res.status(200).json({
      blogs,
      pagination: {
        totalBlogs,
        currentPage,
        perPage,
        totalPages: Math.ceil(totalBlogs / perPage),
        hasNextPage: currentPage < Math.ceil(totalBlogs / perPage),
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getAllPublishedBlogs = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const filter = { isPublished: true };

    // Old flow: if page/limit not provided, return all published blogs
    if (!page && !limit) {
      const blogs = await Blog.find(filter).sort({ createdAt: -1 });
      return res.status(200).json({ blogs });
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.max(parseInt(limit, 10) || 10, 1);
    const skip = (currentPage - 1) * perPage;

    const [blogs, totalBlogs] = await Promise.all([
      Blog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage),
      Blog.countDocuments(filter),
    ]);

    return res.status(200).json({
      blogs,
      pagination: {
        totalBlogs,
        currentPage,
        perPage,
        totalPages: Math.ceil(totalBlogs / perPage),
        hasNextPage: currentPage < Math.ceil(totalBlogs / perPage),
        hasPrevPage: currentPage > 1,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


export const getSingleBlog = async (req, res) => {
  try {
    console.log(req.params);
const blog = await Blog.findOneByLink(req.params.link);
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

