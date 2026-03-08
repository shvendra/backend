import express from "express";
import Chat from "../models/chatSchema.js";

const router = express.Router();

// Fetch chat history (sorted by timestamp)
router.get("/:roomId", async (req, res) => {
  try {
    const chat = await Chat.findOne({ roomId: req.params.roomId });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat room not found",
      });
    }

    // Ensure messages are sorted by timestamp
    const sortedMessages = [...chat.messages].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    res.status(200).json({
      success: true,
      messages: sortedMessages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Save a new message
router.post("/:roomId", async (req, res) => {
  const { sender, message } = req.body;

  // Basic validation
  if (!sender || !message?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Sender and message are required",
    });
  }

  try {
    let chat = await Chat.findOne({ roomId: req.params.roomId });
    if (!chat) {
      chat = new Chat({ roomId: req.params.roomId, messages: [] });
    }

    chat.messages.push({
      sender,
      message,
      timestamp: new Date(), // Explicitly set timestamp
    });

    await chat.save();

    res.status(201).json({
      success: true,
      message: "Message saved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get("/unread-counts/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    // Get all chat documents
    const chats = await Chat.find({});

    const counts = chats.map(chat => {
      const unread = chat.messages.filter(
        (msg) =>
          msg.sender !== userId &&            // not sent by this user
          !msg.readBy.includes(userId)        // and not read by this user
      ).length;

      return {
        postId: chat.roomId,
        unread,
      };
    });

    res.json({ success: true, counts });
  } catch (error) {
    console.error("Error getting unread counts:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;
