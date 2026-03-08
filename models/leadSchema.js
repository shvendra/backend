import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  role: { type: String, required: true },         // e.g. agent, employer, etc.
  name: { type: String, required: true },
  status: { type: String, required: false, default: "new" }, // e.g. new, contacted, in-progress, closed
  phone: { type: String, required: true, unique: true },
}, {
  timestamps: true, // Automatically manages createdAt and updatedAt
});

export const Lead = mongoose.model("Lead", leadSchema);
