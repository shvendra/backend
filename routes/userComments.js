import express from "express";
import UserComment from "../models/UserComment.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, text, createdBy } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newComment = await UserComment.create({
      userId,
      text,
      createdBy,
    });

    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ message: "Error saving comment", error });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const comments = await UserComment.find({ userId: req.params.userId }).sort({
      createdAt: 1, // descending order
    });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching comments", error });
  }
});


export default router;