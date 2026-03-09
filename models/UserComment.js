// models/UserComment.js
import mongoose from "mongoose";

const userCommentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true }, // store logged-in user name or ID
});

export default mongoose.model("UserComment", userCommentSchema);
