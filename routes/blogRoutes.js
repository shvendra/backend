import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import path from "path";
import fs from "fs"; // ✅ IMPORT FS

import {
  createBlog,
  updateBlog,
  deleteBlog,
  getAllBlogs,
  getSingleBlog,
  togglePublishStatus,
  getAllPublishedBlogs,
  likeBlog,
} from "../controllers/blogControllers.js";
import uploadBlogPhoto from "../middlewares/uploadBlogPhoto.js";

const router = express.Router();

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post(
  "/save",
  isAuthenticated,
  (req, res, next) => {
    console.log("[UPLOAD] Request body:", req.body);

    if (!req.files || !req.files.photo) {
      console.error("[UPLOAD] No file found in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.photo;
    const blogDir = "/var/www/uploads/blog_photos";

    if (!fs.existsSync(blogDir)) {
      console.log("[UPLOAD] blog_photos folder missing. Creating...");
      fs.mkdirSync(blogDir, { recursive: true });
    }

    const uploadPath = path.join(blogDir, file.name);

    file.mv(uploadPath, (err) => {
      if (err) {
        console.error("[UPLOAD] File move failed:", err);
        return res.status(500).json({ error: "File upload failed" });
      }
      console.log("[UPLOAD] File saved to:", uploadPath);
      next(); // ✅ call next to trigger createBlog
    });
  },
  createBlog
);

router.post(
  "/update/:id",
  isAuthenticated,
  (req, res, next) => {
    console.log("[UPDATE] Request body:", req.body);

    if (!req.files || !req.files.photo) {
      console.log("[UPDATE] No new file uploaded, skipping file save...");
      return next(); // ✅ Allow update without file upload
    }

    const file = req.files.photo;
    const blogDir = "/var/www/uploads/blog_photos";

    if (!fs.existsSync(blogDir)) {
      console.log("[UPDATE] blog_photos folder missing. Creating...");
      fs.mkdirSync(blogDir, { recursive: true });
    }

    const uploadPath = path.join(blogDir, file.name);

    file.mv(uploadPath, (err) => {
      if (err) {
        console.error("[UPDATE] File move failed:", err);
        return res.status(500).json({ error: "File upload failed" });
      }
      console.log("[UPDATE] File saved to:", uploadPath);
      next(); // ✅ Call next to trigger updateBlog
    });
  },
  updateBlog
);
router.put("/like/:id", likeBlog);
router.get("/list-publish", getAllPublishedBlogs);

router.get("/list", isAuthenticated, getAllBlogs);
router.get("/:id", getSingleBlog);
router.delete("/:id", isAuthenticated, deleteBlog);
router.put("/toggle-publish/:id", isAuthenticated, togglePublishStatus);


export default router;
