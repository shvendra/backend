import express from "express";
import { addComment, getComments } from "../controllers/blogCommentController.js";

const router = express.Router();

router.get("/:id/comments", getComments);
router.post("/:id/comments", addComment);

export default router;
