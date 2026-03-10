import { createCanvas } from "canvas";
import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { sendToken } from "../utils/jwtToken.js";
import { Lead } from "../models/leadSchema.js";
import { sendEMail } from "../utils/sendEmailUser.js";
function generateCaptchaText() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let text = "";
  for (let i = 0; i < 6; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function generateCaptchaImage(text) {
  const canvas = createCanvas(150, 50);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, 150, 50);

  ctx.font = "30px sans-serif";
  ctx.fillStyle = "#333";
  ctx.fillText(text, 20, 35);

  return canvas.toDataURL(); // base64 PNG
}

export const getCaptcha = (req, res) => {
  const captchaText = generateCaptchaText();
  const captchaImage = generateCaptchaImage(captchaText);
  req.session.captcha = captchaText;
  req.session.save((err) => {
    if (err) {
      console.error("Failed to save session:", err);
      return res.status(500).json({ error: "Failed to generate CAPTCHA" });
    }
    res.json({ image: captchaImage });
  });
};

export const verifyCaptcha = (req, res) => {
  console.log("VERIFY sessionID:", req.sessionID);
  console.log("VERIFY stored captcha:", req.session?.captcha);
  console.log("VERIFY entered captcha:", req.body?.captcha);

  const { captcha } = req.body;

  if (!captcha) {
    return res.status(400).json({ message: "CAPTCHA is required" });
  }

  if (
    !req.session.captcha ||
    req.session.captcha.toLowerCase() !== captcha.toLowerCase()
  ) {
    return res.status(400).json({
      message: "Invalid CAPTCHA",
      stored: req.session?.captcha || null,
      entered: captcha || null,
    });
  }

  req.session.captchaVerified = true;
  req.session.save((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to save session" });
    }
    return res.status(200).json({
      success: true,
      message: "CAPTCHA verified successfully",
    });
  });
};

// File: backend/controllers/adminController.js
export const getAllUsers = catchAsyncErrors(async (req, res) => {
  const { role, state, district, phone, status, page, limit, followupstatus, areaOfWork } = req.query;

  const filters = {};

  if (role !== "KYC" && role) filters.role = role;
  if (state) filters.state = { $regex: state, $options: "i" };
  if (district) filters.district = { $regex: district, $options: "i" };
  if (phone) filters.phone = { $regex: phone, $options: "i" };
  if (status) filters.status = status;
  if (followupstatus) filters.followupstatus = followupstatus;
if (areaOfWork) {
  const regex = new RegExp(areaOfWork, "i");

  filters.$or = [
    // 🔹 areasOfWork (proper array)
    { areasOfWork: { $in: [regex] } },

    // 🔹 areasOfWork (stringified JSON)
    { "areasOfWork.0": { $regex: areaOfWork, $options: "i" } },

    // 🔹 categories (proper array)
    { categories: { $in: [regex] } },

    // 🔹 categories (stringified JSON)
    { "categories.0": { $regex: areaOfWork, $options: "i" } },
  ];
}

  if (role === "KYC") {
    filters["kyc.aadharFront"] = { $exists: true, $ne: "" };
    filters["kyc.aadharBack"] = { $exists: true, $ne: "" };
  }

  const currentPage = parseInt(page, 10) || 1;
  const limitPerPage = parseInt(limit, 10) || 50;
  const skip = (currentPage - 1) * limitPerPage;

  try {
    const totalUsersCount = await User.countDocuments(filters);

    let users = await User.find(filters)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitPerPage)
      .lean();

    // ✅ Add Worker Count if role is Agent
    if (role === "Agent" || role === "SelfWorker") {
      const agentIds = users.map((agent) => agent._id);

      const workerCounts = await User.aggregate([
        {
          $match: {
            role: "Worker",
            postedBy: { $in: agentIds.map((id) => id.toString()) },
          },
        },
        { $group: { _id: "$postedBy", count: { $sum: 1 } } },
      ]);

      const countMap = {};
      workerCounts.forEach((item) => {
        countMap[item._id] = item.count;
      });

      users = users.map((agent) => ({
        ...agent,
        workerCount: countMap[agent._id.toString()] || 0,
      }));
    }

    // ✅ Add Agent Info if role is Worker
    if (role === "Worker") {
      const agentIds = users
        .map((worker) => worker.postedBy)
        .filter((id) => id);

      const agents = await User.find(
        { _id: { $in: agentIds } },
        "name phone"
      ).lean();

      const agentMap = {};
      agents.forEach((agent) => {
        agentMap[agent._id.toString()] = agent;
      });

      users = users.map((worker) => ({
        ...worker,
        agentName: agentMap[worker.postedBy]?.name || "",
        agentPhone: agentMap[worker.postedBy]?.phone || "",
      }));
    }

    res.status(200).json({
      users,
      totalUsersCount,
      limit: limitPerPage,
      page: currentPage,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

export const updateStatus = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body; // ✅ get dynamic status from body

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
if (user?.email) {
 const result = sendEMail({
   to: user.email,
   subject: "BookMyWorker KYC Status Update",
   message: `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <div style="text-align: center;">
        <img src="https://bookmyworkers.com/hero-3.jpg" alt="Image" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px;" />
      </div>

      <h2 style="color: #0a5c59;">Hello ${
        user?.name?.split(" ")[0] || "User"
      },</h2>

      <p>We wanted to let you know that your profile status has been updated.</p>

      <p><strong>Current Profile Status:</strong> ${
        user.status == "Verified" ? "Unverified" : "Verified"
      }</p>

      <p>Thank you for being a part of BookMyWorker. If you have any questions, feel free to reach out.</p>

      <hr style="margin: 30px 0; border: none; border-top: 1px solid #ccc;" />

      <div style="font-size: 14px; color: #555;">
        <strong>BookMyWorker</strong><br />
        Khasara No. 34/1/33, Rewa Semariya Road, Karahiya, Rewa, MP - 486450<br />
        <strong>Email:</strong> <a href="mailto:support@bookmyworkers.com">support@bookmyworkers.com</a><br />
        <strong>Website:</strong> <a href="https://bookmyworkers.com">https://bookmyworkers.com</a><br />
        <strong>GST:</strong> 23NBJPS3070R1ZQ
      </div>

      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #aaa;">
        © ${new Date().getFullYear()} BookMyWorker. All rights reserved.
      </div>
    </div>
  `,
 });
  if (result?.success) {
    console.log(`✅ Email sent to ${user?.email}`);
  } else {
    console.error(`❌ Email failed to send to ${user?.email}:`, result.error);
  }
} else {
  console.warn("⚠️ No email provided. Skipping email send.");
}


if(!user.bmwId) {
  generateUniqueBookMyWorkerId(userId);
}
    user.status = status;
    await user.save();

    res.status(200).json({ message: "User status updated successfully", user });
  } catch (error) {
    console.error("Error updating user status", error);
    res
      .status(500)
      .json({ message: "Failed to update user status", error: error.message });
  }
});

const generateUniqueBookMyWorkerId = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Extract parts
  const phoneLast2 = user.phone?.slice(-2) || '00';
  const firstName = user.name?.trim().split(' ')[0]?.slice(0, 2).toUpperCase() || 'XX';
  const rolePart = user.role?.slice(0, 2).toUpperCase() || 'XX';

  let bmwId;
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(10 + Math.random() * 90); // 2-digit random number
    bmwId = `${phoneLast2}${firstName}${rolePart}${randomDigits}`;

    // Check for uniqueness
    const existingUser = await User.findOne({ bmwId });
    if (!existingUser) {
      isUnique = true;
    }
  }

  // Update the user document
  user.bmwId = bmwId;
  await user.save();

  console.log(`bmwId generated and updated: ${bmwId}`);
  return bmwId;
};

export const updateFollowUpStatus = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params;
  const { followupstatus, serviceArea, categories } = req.body; // ✅ add categories

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ update followup status if sent
    if (followupstatus !== undefined) {
      user.followupstatus = followupstatus;
    }

    // ✅ update service area if sent
    if (serviceArea !== undefined) {
      user.serviceArea = Array.isArray(serviceArea)
        ? serviceArea
        : [serviceArea];
    }

    // ✅ update categories ONLY if sent
    if (categories !== undefined) {
      user.categories = Array.isArray(categories)
        ? categories
        : [categories];
    }

    await user.save();

    res.status(200).json({
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating user", error);
    res.status(500).json({
      message: "Failed to update user",
      error: error.message,
    });
  }
});


export const updateSourceType = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params;
  const { sourcetype } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Update only if provided
    if (sourcetype !== undefined) {
      user.sourcetype = sourcetype;
    }

    await user.save();

    res.status(200).json({
      message: "Source type updated successfully",
      user,
    });
  } catch (error) {
    console.error("Error updating source type", error);
    res.status(500).json({
      message: "Failed to update source type",
      error: error.message,
    });
  }
});

export const loginAdmin = catchAsyncErrors(async (req, res, next) => {
  const { phone, captcha, role } = req.body;
  if (!phone) {
    return next(new ErrorHandler("Please provide phone, password, and role."));
  }

  // if (!req.session.captcha) {
  //   return res.status(400).json({ message: "Captcha not found. Try again." });
  // }

  // if (captcha.toUpperCase() !== req.session.captcha.toUpperCase()) {
  //   return res.status(400).json({ message: "Invalid CAPTCHA" });
  // }
  const user = await User.findOne({ phone, role }).select("+role");
  if (!user) {
    return next(new ErrorHandler("User not found. Please register.", 404));
  }
  if (user.role === "Admin" || user.role === "SuperAdmin") {
    sendToken(user, 200, res, "Logged in successfully!");
  }
});

export const updateLeadStatus = catchAsyncErrors(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  try {
    const lead = await Lead.findById(userId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // Update the followupstatus field
    lead.status = status;

    await lead.save();

    res.status(200).json({
      message: "Lead status updated successfully",
      lead,
    });
  } catch (error) {
    console.error("Error updating lead status", error);
    res.status(500).json({
      message: "Failed to update follow-up status",
      error: error.message,
    });
  }
});
