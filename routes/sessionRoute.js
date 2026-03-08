// routes/sessionRoute.js
import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const router = express.Router();
const activeSessions = new Map(); // Store temporary session tokens

// Generate session token (valid for 5 minutes)
// router.get("/start", (req, res) => {
//   const token = crypto.randomBytes(24).toString("hex");
//   const expiry = Date.now() + 5 * 60 * 1000;
//   activeSessions.set(token, expiry);

//   res.status(200).json({ sessionToken: token });
// });
router.get("/start", (req, res) => {
  console.log("fghjgfd. t")
    console.log("JWT_SECRET value:", process.env.JWT_SECRET_KEY);

  try {
    const sessionToken = jwt.sign(
      { purpose: "otp" },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "5m" } // 5 minutes
    );

    return res.status(200).json({ sessionToken });
  } catch (err) {
    return res.status(500).json({ message: "Failed to create session" });
  }
});
// Middleware to verify token

export function verifySession(req, res, next) {
  console.log("===== VERIFY SESSION =====");
  console.log("HEADERS:", req.headers);
  console.log("TOKEN:", req.headers["x-session-token"]);
  console.log("JWT_SECRET:", process.env.JWT_SECRET_KEY);

  const token = req.headers["x-session-token"];

  if (!token) {
    console.log("❌ TOKEN MISSING");
    return res.status(403).json({ message: "Unauthorized or missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    console.log("✅ DECODED:", decoded);

    if (decoded.purpose !== "otp") {
      console.log("❌ PURPOSE INVALID");
      return res.status(403).json({ message: "Invalid session token" });
    }

    next();
  } catch (err) {
    console.log("❌ JWT ERROR:", err.message);
    return res.status(403).json({ message: "Session expired or invalid" });
  }
}


// Cleanup every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of activeSessions.entries()) {
    if (expiry < now) activeSessions.delete(token);
  }
}, 10 * 60 * 1000);

export default router;
