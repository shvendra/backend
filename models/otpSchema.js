// models/otp.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  role: { type: String },
  otp: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  cooldownUntil: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

const OTP = mongoose.model("OTP", otpSchema);
export default OTP;
