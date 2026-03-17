import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { User } from "../models/userSchema.js";
import { verifySession } from "./sessionRoute.js"; // import the middleware
import OTP from "../models/otpSchema.js";

dotenv.config();

const router = express.Router();

// --- In-memory OTP + request history store (use Redis in production) ---
const otpStore = new Map(); // phone -> { otp, expiresAt, cooldownUntil }
const otpRequestHistory = new Map(); // phone -> [timestamps]

const waitTime = 75420;
const hours = Math.floor(waitTime / 3600);
const minutes = Math.floor((waitTime % 3600) / 60);
const seconds = waitTime % 60;
const readableTime = `${hours}h ${minutes}m ${seconds}s`;

// --- Daily OTP limit ---
const dailyOtpTracker = new Map(); // phone -> { count, firstRequestTime }
const maxDailyOtps = 4;
const oneDayMs = 24 * 60 * 60 * 1000;

function verifyRequestSource(req) {
  const referer = req.headers.referer || "";
  const origin = req.headers.origin || "";
  const allowedDomains = [
    "https://bookmyworkers.com",
    "https://www.bookmyworkers.com",
    "http://localhost:3000",
  ];

  return allowedDomains.some(
    (domain) => referer.startsWith(domain) || origin.startsWith(domain)
  );
}


// --- Send OTP Route ---

router.post("/send-otp", verifySession, async (req, res) => {
  try {
    if (!verifyRequestSource(req)) {
      return res.status(403).json({ message: "Unauthorized request source" });
    }

    const { phone, firstName = "User", lastName = "", role } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 min
    const maxOtps = 3;

    // ✅ RATE LIMIT: fetch OTPs in last 10 mins
    const recentOtps = await OTP.find({
      phone,
      createdAt: { $gt: new Date(now - windowMs) }
    });

    if (recentOtps.length >= maxOtps) {
      const waitTime = Math.ceil((recentOtps[0].createdAt.getTime() + windowMs - now) / 1000);
      return res.status(429).json({
        message: `Too many OTP requests for this number. Please try again in ${waitTime}s.`,
      });
    }

    // ✅ Daily limit logic (same as before)
    let dailyLog = dailyOtpTracker.get(phone);
    if (!dailyLog || now - dailyLog.firstRequestTime > oneDayMs) {
      dailyLog = { count: 1, firstRequestTime: now };
      dailyOtpTracker.set(phone, dailyLog);
    } else if (dailyLog.count >= maxDailyOtps) {
      const resetTime = new Date(dailyLog.firstRequestTime + oneDayMs);
      const waitTime = Math.ceil((resetTime - now) / 1000);
      return res.status(429).json({
        message: `Daily OTP limit reached. Try again in ${waitTime}s.`,
      });
    } else {
      dailyLog.count += 1;
      dailyOtpTracker.set(phone, dailyLog);
    }

    // ✅ Existing user check
    const existingUser = await User.findOne({ phone, role });
    if (!existingUser && role !== "register") {
      return res.status(400).json({ success: false, message: "Phone number not registered with this role!" });
    }

    // ✅ GENERATE OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Save OTP in DB
    const otpDoc = new OTP({
      phone,
      role,
      otp,
      expiresAt: new Date(now + 5 * 60 * 1000),
      cooldownUntil: new Date(now + 30 * 1000),
    });
    await otpDoc.save();

    const message = `Your OTP is ${otp}`;
    const payload = {
      data: { body_variables: [`${otp}`] },
      recipients: [
        {
          whatsapp_number: phone.startsWith("+") ? phone : `+91${phone}`,
          first_name: firstName,
          last_name: lastName,
          attributes: {
            custom_attribute_1: message,
            custom_attribute_2: "OTP verification",
            custom_attribute_3: new Date().toLocaleString(),
          },
          lists: ["Default"],
          tags: ["new lead", "notification sent"],
          replace: false,
        },
      ],
    };

    const wanotifierEndpoint = "https://app.wanotifier.com/api/v1/notifications/A6bKc2FDWM";
    const apiKey = process.env.WANOTIFIER_API_KEY || "Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";

    const response = await fetch(`${wanotifierEndpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`✅ OTP sent to ${phone}: ${otp}`);
      }
      return res.status(200).json({ message: "OTP sent successfully" });
    } else {
      console.error("Wanotifier Error:", data);
      return res.status(502).json({ message: "Failed to send OTP via provider", detail: data });
    }
  } catch (error) {
    console.error("OTP Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/send-otp-admin", async (req, res) => {
  if (!verifyRequestSource(req)) {
    return res.status(403).json({ message: "Unauthorized request source" });
  }

  try {
    if (!req.session.captchaVerified) {
      return res.status(403).json({ message: "Please verify CAPTCHA first" });
    }

    const { phone, firstName = "User", lastName = "", role } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    const now = Date.now();

    // --- Daily OTP limit check ---
    let dailyLog = dailyOtpTracker.get(phone);
    if (!dailyLog || now - dailyLog.firstRequestTime > oneDayMs) {
      dailyLog = { count: 1, firstRequestTime: now };
      dailyOtpTracker.set(phone, dailyLog);
    } else if (dailyLog.count >= maxDailyOtps) {
      const resetTime = new Date(dailyLog.firstRequestTime + oneDayMs);
      const waitTime = Math.ceil((resetTime - now) / 1000);
      return res.status(429).json({
        message: `Daily OTP limit reached. Try again in ${waitTime}s.`,
      });
    } else {
      dailyLog.count += 1;
      dailyOtpTracker.set(phone, dailyLog);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const message = `Your OTP is ${otp}`;

    const existingUser = await User.findOne({ phone, role });
    if (!existingUser && role !== "register") {
      return res.status(400).json({ success: false, message: "Phone number not registered with this role!" });
    }

    // --- Store OTP in MongoDB instead of in-memory ---
    await OTP.findOneAndUpdate(
      { phone },
      { otp, expiresAt: new Date(now + 5 * 60 * 1000) }, // 5 min expiry
      { upsert: true, new: true }
    );

    // --- Send OTP via WANotifier ---
    const payload = {
      data: { body_variables: [`${otp}`] },
      recipients: [
        {
          whatsapp_number: phone.startsWith("+") ? phone : `+91${phone}`,
          first_name: firstName,
          last_name: lastName,
          attributes: {
            custom_attribute_1: message,
            custom_attribute_2: "OTP verification",
            custom_attribute_3: new Date().toLocaleString(),
          },
          lists: ["Default"],
          tags: ["new lead", "notification sent"],
          replace: false,
        },
      ],
    };


      const wanotifierEndpoint = "https://app.wanotifier.com/api/v1/notifications/A6bKc2FDWM";
      const apiKey = process.env.WANOTIFIER_API_KEY || "Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";


    const response = await fetch(`${wanotifierEndpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      req.session.captchaVerified = false;
      console.log(`✅ Admin OTP sent to ${phone}: ${otp}`);
      return res.status(200).json({ message: "OTP sent successfully" });
    } else {
      console.error("WANotifier Error:", data);
      return res.status(500).json({ message: "Failed to send OTP", detail: data });
    }
  } catch (error) {
    console.error("OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// --- Admin OTP route (CAPTCHA required) ---
router.post("/send-otp-admin", async (req, res) => {
   if (!verifyRequestSource(req)) {
      return res.status(403).json({ message: "Unauthorized request source" });
    }
  try {
    if (!req.session.captchaVerified) {
      return res.status(403).json({ message: "Please verify CAPTCHA first" });
    }

    const { phone, firstName = "User", lastName = "", role } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    const now = Date.now();

    // --- Daily OTP limit check ---
    let dailyLog = dailyOtpTracker.get(phone);
    if (!dailyLog || now - dailyLog.firstRequestTime > oneDayMs) {
      dailyLog = { count: 1, firstRequestTime: now };
      dailyOtpTracker.set(phone, dailyLog);
    } else if (dailyLog.count >= maxDailyOtps) {
      const resetTime = new Date(dailyLog.firstRequestTime + oneDayMs);
      const waitTime = Math.ceil((resetTime - now) / 1000);
      return res.status(429).json({
        message: `Daily OTP limit reached. Try again in ${readableTime}.`,
      });
    } else {
      dailyLog.count += 1;
      dailyOtpTracker.set(phone, dailyLog);
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const message = `Your OTP is ${otp}`;
    const existingUser = await User.findOne({ phone, role });

    if (existingUser || role === "register") {
      otpStore.set(phone, { otp, expiresAt: now + 5 * 60 * 1000 });

      const payload = {
        data: { body_variables: [`${otp}`] },
        recipients: [
          {
            whatsapp_number: phone.startsWith("+") ? phone : `+91${phone}`,
            first_name: firstName,
            last_name: lastName,
            attributes: {
              custom_attribute_1: message,
              custom_attribute_2: "OTP verification",
              custom_attribute_3: new Date().toLocaleString(),
            },
            lists: ["Default"],
            tags: ["new lead", "notification sent"],
            replace: false,
          },
        ],
      };

      const wanotifierEndpoint = "https://app.wanotifier.com/api/v1/notifications/A6bKc2FDWM";
      const apiKey = process.env.WANOTIFIER_API_KEY || "Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";

      const response = await fetch(`${wanotifierEndpoint}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        req.session.captchaVerified = false;
        return res.status(200).json({ message: "OTP sent successfully" });
      } else {
        return res.status(500).json({ message: "Failed to send OTP", detail: data });
      }
    } else {
      return res.status(400).json({ success: false, message: "Phone number not registered with this role!" });
    }
  } catch (error) {
    console.error("OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});
// OTP Verification Route

router.post("/verify-otp", async (req, res) => {
  const { phone, otp, captcha, role } = req.body;

  if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP are required" });

  // CAPTCHA check for non-register/reset roles
  if (role !== "register" && role !== "resetPassword") {
    if (!captcha) return res.status(400).json({ message: "CAPTCHA is required" });
    if (!req.session.captcha || req.session.captcha.toLowerCase() !== captcha.toLowerCase())
      return res.status(400).json({ message: "Invalid CAPTCHA" });
    req.session.captcha = null;
  }

  // ✅ Fetch OTP from DB
  const stored = await OTP.findOne({ phone }).sort({ createdAt: -1 });
  if (!stored) return res.status(400).json({ message: "No OTP found or expired" });
console.log("Stored OTP:", stored.otp);
console.log("Stored expiresAt:", stored.expiresAt);
console.log("Stored expiresAt ms:", stored.expiresAt?.getTime?.());
console.log("Current Date:", new Date());
console.log("Current ms:", Date.now());
  if (Date.now() > stored.expiresAt.getTime()) {
    await OTP.deleteOne({ _id: stored._id });
    return res.status(400).json({ message: "OTP has expired" });
  }

  if (String(stored.otp).trim() !== String(otp).trim())
    return res.status(400).json({ message: "Invalid OTP" });

  // ✅ OTP is correct, remove from DB
  await OTP.deleteOne({ _id: stored._id });

  return res.status(200).json({
    success: true,
    message: "OTP verified successfully" + (role !== "register" && role !== "resetPassword" ? " & CAPTCHA" : ""),
  });
});


// --- Cleanup expired OTP logs every hour ---
setInterval(() => {
  const now = Date.now();

  // 1️⃣ Clean up daily OTP tracker (24h expiry)
  for (const [phone, log] of dailyOtpTracker.entries()) {
    if (now - log.firstRequestTime > oneDayMs) {
      dailyOtpTracker.delete(phone);
    }
  }

  // 2️⃣ Clean up expired OTPs (5 min expiry)
  for (const [phone, otpData] of otpStore.entries()) {
    if (otpData.expiresAt < now) {
      otpStore.delete(phone);
    }
  }

  // 3️⃣ Clean up old request history timestamps (10 min window)
  for (const [phone, history] of otpRequestHistory.entries()) {
    const filtered = history.filter((ts) => now - ts < 10 * 60 * 1000);
    if (filtered.length > 0) {
      otpRequestHistory.set(phone, filtered);
    } else {
      otpRequestHistory.delete(phone);
    }
  }

  console.log("♻️ OTP logs cleaned up at", new Date().toLocaleString());
}, 60 * 60 * 1000); // runs every hour


export default router;
