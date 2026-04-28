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
import uploadToS3 from "../utils/s3.js";

const router = express.Router();

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { cache } from "../middlewares/cache.js"; // ✅ REDIS CACHING

router.post(
  "/save",
  createBlog
);

router.post(
  "/update/:id",
  isAuthenticated,
  async (req, res, next) => {
    try {
      console.log("[UPDATE] Request body:", req.body);

      if (!req.files || !req.files.photo) {
        console.log("[UPDATE] No new file uploaded, skipping S3 upload...");
        return next();
      }

      const file = req.files.photo;

      const fileName = file.name.replace(/\s+/g, "_");
      const key = `blog_photos/${fileName}`;

      await uploadToS3(file.data, key, file.mimetype);

      req.body.photo = key;

      console.log("[UPDATE] File uploaded to S3:", key);

      next();
    } catch (err) {
      console.error("[UPDATE] S3 upload failed:", err);
      return res.status(500).json({ error: "File upload failed" });
    }
  },
  updateBlog
);
router.put("/like/:id", likeBlog);
router.get("/list-publish", getAllPublishedBlogs);

router.get("/list", isAuthenticated, getAllBlogs);
router.get("/:link", getSingleBlog);
router.delete("/:id", isAuthenticated, deleteBlog);
router.put("/toggle-publish/:id", isAuthenticated, togglePublishStatus);


export default router;
