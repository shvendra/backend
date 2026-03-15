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

router.post(
  "/save",
  isAuthenticated,
  async (req, res, next) => {
    try {
      console.log("[UPLOAD] Request body:", req.body);

      if (!req.files || !req.files.photo) {
        console.error("[UPLOAD] No file found in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.files.photo;

      const fileExtension =
        file.name?.split(".").pop() ||
        file.mimetype?.split("/").pop() ||
        "jpg";

      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
      const key = `blog_photos/${fileName}`;

      await uploadToS3(file.data, key, file.mimetype);

      req.body.photo = key; // save S3 key in DB
      console.log("[UPLOAD] File uploaded to S3:", key);

      next();
    } catch (err) {
      console.error("[UPLOAD] S3 upload failed:", err);
      return res.status(500).json({ error: "File upload failed" });
    }
  },
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
      const blogId = req.params.id;

      const fileExtension =
        file.name?.split(".").pop() ||
        file.mimetype?.split("/").pop() ||
        "jpg";

      const key = `blog_photos/${blogId}_${Date.now()}.${fileExtension}`;

      await uploadToS3(file.data, key, file.mimetype);

      req.body.photo = key; // save updated S3 key in DB
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
router.get("/:id", getSingleBlog);
router.delete("/:id", isAuthenticated, deleteBlog);
router.put("/toggle-publish/:id", isAuthenticated, togglePublishStatus);


export default router;
