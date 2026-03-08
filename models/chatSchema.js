import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  sender: String,
  role: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
  roomId: String,
  readBy: {
    type: [String], // array of user IDs who have read the message
    default: [],
  },
});

const chatSchema = new mongoose.Schema({
  roomId: String,
  messages: [messageSchema],
});

export default mongoose.model("Chat", chatSchema);
