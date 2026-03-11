import { catchAsyncErrors } from "../middlewares/catchAsyncError.js";
import { User } from "../models/userSchema.js";
import { Lead } from "../models/leadSchema.js";
import { Payment } from "../models/paymentSchema.js";
import { sendWaNotifierMessage } from "../utils/messageWhatsapp.js";
import ErrorHandler from "../middlewares/error.js";
import { sendToken } from "../utils/jwtToken.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import bcrypt from 'bcryptjs';
import { sendEMail } from "../utils/sendEmailUser.js";
import { fi } from "date-fns/locale";
import UploadLink from "../models/UploadLinkSchema.js";
import crypto from "crypto";
import UserWorkerRemark from "../models/UserWorkerSchema.js";
import uploadToS3 from "../utils/s3.js";

const categoriesPath = path.resolve("./controllers/categories.json"); // relative to server.js

const categories = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const calculateExpiryDate = (startDate, months) => {
  const expiry = new Date(startDate);
  expiry.setMonth(expiry.getMonth() + months);
  return expiry;
};

const PLAN_CONFIG = {
  "1m": {
    subscriptionType: "Monthly",
    durationMonths: 1,
    remainingContacts: 50,
    remainingPosts: 25,
  },
  "6m": {
    subscriptionType: "Half-Yearly",
    durationMonths: 6,
    remainingContacts: 300,
    remainingPosts: 50,
  },
  "12m": {
    subscriptionType: "Yearly",
    durationMonths: 12,
    remainingContacts: 600,
    remainingPosts: 75,
  },
};


export const register = catchAsyncErrors(async (req, res, next) => {
  const {
    pinCode,
    address,
    name,
    email,
    phone,
    password,
    addresses,
    employerType,
    role,
    state,
    district,
    block,
    referredBy
  } = req.body;

  // Ensure required fields are present
  if (!name || !phone || !password || !role) {
    return res.status(400).json({
      success: false,
      message: "Please fill full form!",
    });
  }
  await Lead.findOneAndDelete({ phone });
  // Check if phone already exists
  const existingUser = await User.findOne({ phone, role });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: "Phone number already registered with this role!",
    });
  }

  // Prepare user data
  const userData = {
    pinCode,
    address,
    name,
    phone,
    password,
    role,
    addresses,
    employerType,
    state,
    district,
    block,
    referredBy
  };

  // Include email only if Employer
 if ((role === "Employer" || role === "Agent") && email) {
  userData.email = email;
}


  try {
    const user = await User.create(userData);
      const payload = {
        recipients: [
          {
            whatsapp_number: `+91${phone}`,
            first_name: userData?.name || "User",
            last_name: "",
            attributes: {
              custom_attribute_1: "New registration",
              custom_attribute_2: "General",
              custom_attribute_3: `${userData?.state ?? "N/A"}, ${
                userData?.district ?? "N/A"
              }`,
            },
            lists: ["Default"],
            tags: ["new user", "notification sent"],
            replace: false,
          },
        ],
      };
      var wanotifierEndpoint =
        "https://app.wanotifier.com/api/v1/notifications/UaK42ksrpM?key=Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";
      if (user.role === "Employer") {
        wanotifierEndpoint =
          "https://app.wanotifier.com/api/v1/notifications/y1hHD5lRnR?key=Kvnrzau1GMzI925TmjR3Jl8MWZbKWZ";
      }
      await sendWaNotifierMessage(wanotifierEndpoint, payload);
if (user?.email) {
  const roleMessage = user.role === "Employer"
    ? `<p>You can now post your worker requirements, view profiles, and manage your workforce with ease.</p>`
    : user.role === "Agent" || user.role === "SelfWorker"
      ? `<p>You can now log in to your account, complete KYC, and register your workers. We will send work invites shortly.</p>`
      : `<p>Thank you for registering with BookMyWorkers.</p>`;

  const result = sendEMail({
    to: user.email,
    subject: "Welcome to BookMyWorker – Registration Successful",
    message: `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <div style="text-align: center;">
          <img src="https://bookmyworkers.com/hero-3.jpg" alt="Image" style="width: 100%; max-width: 100%; height: auto; border-radius: 6px;" />
        </div>

        <h2 style="color: #0a5c59;">Welcome ${user?.name?.split(" ")[0] || "User"},</h2>

        <p>Your registration with <strong>BookMyWorkers</strong> has been successfully completed.</p>


        ${roleMessage}

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

  if (result.success) {
    console.log(`✅ Registration email sent to ${user.email}`);
  } else {
    console.error(`❌ Registration email failed to send to ${user.email}:`, result.error);
  }
} else {
  console.warn("⚠️ No email provided. Skipping registration email.");
}


    // sendToken(user, 201, res, "User Registered Successfully!");
    return res.status(201).json({
      success: true,
      message: "User Registered Successfully.",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register user. Please try again.",
    });
  }
});


export const uploadKycDocuments = catchAsyncErrors(async (req, res) => {
  const userId = req.uploadUserId;
  const updateData = {};

  // PROFILE PHOTO
  if (req.files?.profilePhoto) {
    const fileName = `${userId}_profile.jpg`;
    const key = `profile_photo/${fileName}`;

    await uploadToS3(
      req.files.profilePhoto.data,
      key,
      req.files.profilePhoto.mimetype
    );

    updateData.profilePhoto = key;
  }

  // AADHAR FRONT
  if (req.files?.aadharFront) {
    const fileName = `${userId}_aadhar_front.jpg`;
    const key = `kyc_doc/${fileName}`;

    await uploadToS3(
      req.files.aadharFront.data,
      key,
      req.files.aadharFront.mimetype
    );

    updateData["kyc.aadharFront"] = key;
  }

  // AADHAR BACK
  if (req.files?.aadharBack) {
    const fileName = `${userId}_aadhar_back.jpg`;
    const key = `kyc_doc/${fileName}`;

    await uploadToS3(
      req.files.aadharBack.data,
      key,
      req.files.aadharBack.mimetype
    );

    updateData["kyc.aadharBack"] = key;
  }

  await User.findByIdAndUpdate(userId, { $set: updateData });

  res.json({
    success: true,
    message: "Documents uploaded successfully",
  });
});


export const generateUploadLink = catchAsyncErrors(async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "UserId is required",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await UploadLink.create({
    userId,
    token,
    expiresAt,
  });

  // 🔥 IMPORTANT FIX
  const link = `${process.env.FRONTEND_URL}/job/public/${token}`;

  res.status(201).json({
    success: true,
    link,
    expiresAt,
  });
});

export const login = catchAsyncErrors(async (req, res, next) => {
  const { phone, email, password } = req.body;

  if ((!phone && !email) || !password) {
    return next(new ErrorHandler("Please provide phone/email and password.", 400));
  }

  // Find users by phone or email
  const query = phone ? { phone } : { email };
  const users = await User.find(query).select("+password");

  if (!users.length) {
    return next(new ErrorHandler("User not found. Please register.", 404));
  }

  // Try matching password for each user
  let matchedUser = null;
  for (const u of users) {
    const isPasswordMatched = await bcrypt.compare(password, u.password);
    if (isPasswordMatched) {
      matchedUser = u;
      break;
    }
  }

  if (!matchedUser) {
    return next(new ErrorHandler("Incorrect password.", 401));
  }

  if (matchedUser.status === "Block") {
    return next(
      new ErrorHandler(
        "Your account has been locked. Please contact our support team at support@bookmyworkers.com for assistance.",
        403
      )
    );
  }

  // Extract available roles for that phone/email
  const availableRoles = users.map((u) => u.role);

  // ✅ Count how many users have this user's phone number in their 'referredBy' field
  const referralCount = await User.countDocuments({ referredBy: matchedUser.phone });

  // Send login success with available roles + referral count
  sendToken(matchedUser, 200, res, "Logged in successfully!", {
    availableRoles,
    referralCount, // 👈 added field
  });
});

export const updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { phone, password, role } = req.body;

  if (!phone || !password) {
    return next(new ErrorHandler("Phone and new password are required.", 400));
  }

  const user = await User.findOne({ phone, role });

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  user.password = password;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

export const logout = catchAsyncErrors(async (req, res, next) => {
  res
    .status(201)
    .cookie("token", "", {
      httpOnly: true,
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Logged Out Successfully !",
    });
});

export const getUser = catchAsyncErrors((req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});
export const getUsersByReferredBy = catchAsyncErrors(async (req, res, next) => {
  const { referredBy } = req.query;
  if (!referredBy) {
    return res.status(400).json({
      success: false,
      message: "referredBy is required",
    });
  }

  // Fetch all users who were referred by the given identifier
  const users = await User.find({ referredBy }).select(
    "name phone district state role createdAt"
  );

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});
export const updateEmployerPaymentStatus = async (_id, employerType, planId) => {
  try {
    // Validate plan
    const plan = PLAN_CONFIG[planId];
    if (!plan || !employerType) {
      console.warn("Invalid planId or employerType:", planId, employerType);
      return null;
    }

    const now = new Date();
    const expiryDate = calculateExpiryDate(now, plan.durationMonths);

    const updateData = {
      isSubscribed: true,
      // Subscription info
      subscriptionType: plan.subscriptionType,
      lastsubscriptionDate: now,
      subscriptionExpery: expiryDate,

      // Limits
      remainingContacts: plan.remainingContacts,
      remainingPosts: plan.remainingPosts,
    };

    const updatedUser = await User.findByIdAndUpdate(
      _id,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      console.warn("No user found with ID:", _id);
      return null;
    }

    return updatedUser;
  } catch (error) {
    console.error("Subscription Update Error:", error);
    return null;
  }
};


export const updateEmployerPaymentVerifiedBadgeStatus = async (_id) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { veryfiedBage: true },
      { new: true }
    );
console.log(updatedUser);
    if (!updatedUser) {
      console.warn("No user found with ID:", _id);
      return null;
    }

    return updatedUser;
  } catch (error) {
    console.error("veryfiedbadge Update Error:", error);
    return null; // Handle gracefully
  }
};

export const setRole = catchAsyncErrors(async (req, res, next) => {
  const { role, phone } = req.body;

  // ✅ Validate role
  if (!role) {
    return next(new ErrorHandler("Role is required", 400));
  }

  const validRoles = ["Employer", "Agent", "SelfWorker"];
  if (!validRoles.includes(role)) {
    return next(new ErrorHandler("Invalid role provided", 400));
  }

  // ✅ Find user (by phone or by req.user)
  let user = await User.findOne({phone, role});

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // ✅ Update user role
  user.role = role;
  await user.save();

  // ✅ Refresh session or JWT token with new role
  // Assuming you use cookie-based auth (JWT token in cookie)
  const token = user.getJWTToken(); // your User model should have this method
  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    sameSite: "None",
    secure: true,
  });

  res.status(200).json({
    success: true,
    message: `Role switched to ${role}`,
    user,
  });
});




export const getUserByRole = catchAsyncErrors(async (req, res, next) => {
  const { phone, role } = req.query;

  if (!phone || !role) {
    return next(new ErrorHandler("Phone and role are required", 400));
  }

  // Find the user with given phone and role
  const user = await User.findOne({ phone, role });

  if (!user) {
    return next(new ErrorHandler("User not found for this role", 404));
  }

  // Prepare data based on role
  let roleData = {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email || "",
    role: user.role,
    state: user.state || "",
    district: user.district || "",
    block: user.block || "",
    addresses: user.addresses || [],
    status: user.status,
    kyc: user.kyc,
    profilePhoto: user.profilePhoto,
  };

  if (role === "Agent" || role === "SelfWorker") {
    roleData = {
      ...roleData,
      categories: user.categories || [],
      areasOfWork: user.areasOfWork || [],
      bankDetails: user.bankDetails || {}
    };
  } else if (role === "Employer") {
    roleData = {
      ...roleData,
      employerType: user.employerType || {},
      serviceArea: user.serviceArea || [],
    };
  }

  res.status(200).json({
    success: true,
    user: roleData,
  });
});

export const updateUser = async (req, res) => {
  try {
    // const { _id } = req.user;
    const _id = req.body.userId || req.user._id;

    const {
      name,
      phone,
      address,
      accountNumber,
      ifscCode,
      bankName,
      aadharNumber,
      gstNumber,
      firmName,
      firmAddress,
      role,
      state,
      district,
      block,
      status,
      gender
    } = req.body;

    const oldPassword = req.body.oldPassword?.trim();
    const newPassword = req.body.newPassword?.trim();
    const confirmPassword = req.body.confirmPassword?.trim();

    const userDoc = await User.findById(_id).select("+password");
    if (!userDoc) return res.status(404).json({ success: false, message: "User not found" });

    // Password update logic
    if (oldPassword || newPassword || confirmPassword) {
      if (!oldPassword || !newPassword || !confirmPassword)
        return res.status(400).json({ success: false, message: "Fill all password fields" });

      const isPasswordMatched = await bcrypt.compare(oldPassword, userDoc.password);
      if (!isPasswordMatched) return res.status(401).json({ success: false, message: "Old password incorrect" });

      if (newPassword !== confirmPassword)
        return res.status(400).json({ success: false, message: "New password and confirm password must match" });

      userDoc.password = newPassword;
    }

    // Prepare update object
    const updateData = {
      name,
      address,
      phone: userDoc.status !== "Verified" ? phone : userDoc.phone, // Only allow phone update if not Verified
      bankDetails: { accountNumber, ifscCode, bankName },
      kyc: { aadharNumber, gstNumber, firmName, firmAddress },
      serviceArea: [],
      categories: [],
      state: state ? state : userDoc.state,
      district: district ? district : userDoc.district,
      block: block ? block : userDoc.block,
      role: role ? role : userDoc.role,
      firmName: firmName ? firmName : userDoc.firmName,
      firmAddress: firmAddress ? firmAddress : userDoc.firmAddress,
      status: status ? status : userDoc.status,
      gender: gender ? gender : userDoc.gender,
    };

    // Parse JSON arrays safely
    try {
      updateData.serviceArea = req.body.serviceArea ? JSON.parse(req.body.serviceArea) : [];
    } catch (err) {
      console.error("Invalid serviceArea format");
      updateData.serviceArea = [];
    }

    try {
      updateData.categories = req.body.categories ? JSON.parse(req.body.categories) : [];
    } catch (err) {
      console.error("Invalid categories format");
      updateData.categories = [];
    }


if (!updateData.kyc) updateData.kyc = {};

updateData.kyc.aadharFront = userDoc?.kyc?.aadharFront || "";
updateData.kyc.aadharBack = userDoc?.kyc?.aadharBack || "";

// AADHAR FILES (only if NOT Verified)
if (userDoc.status !== "Verified") {

  if (req.files?.aadharFront) {
    const key = `kyc_doc/${_id}_aadhar_front.jpg`;

    await uploadToS3(
      req.files.aadharFront.data,
      key,
      req.files.aadharFront.mimetype
    );

    updateData.kyc.aadharFront = key;
  }

  if (req.files?.aadharBack) {
    const key = `kyc_doc/${_id}_aadhar_back.jpg`;

    await uploadToS3(
      req.files.aadharBack.data,
      key,
      req.files.aadharBack.mimetype
    );

    updateData.kyc.aadharBack = key;
  }
}

// PROFILE PHOTO (always allowed)
if (req.files?.profilePhoto) {
  const key = `profile_photo/${_id}_profile.jpg`;
  await uploadToS3(
    req.files.profilePhoto.data,
    key,
    req.files.profilePhoto.mimetype
  );

  updateData.profilePhoto = key;
}


    // Update user
    await User.findByIdAndUpdate(_id, { $set: updateData });

    // Save password if changed
    if (oldPassword && newPassword && newPassword === confirmPassword) await userDoc.save();

    const updatedUser = await User.findById(_id);
    res.json({ success: true, message: "Updated successfully!", user: updatedUser });

  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAgents = async (req, res) => {
  try {
    const {
      state,
      city,
      block,
      workerType,
      gender,
      minAge,
      maxAge,
      status,
      page = 1,
      limit = 25,
      workerGroup,
    } = req.query;

    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 25;

    let filter = {
      role: { $in: ["Agent", "SelfWorker", "Worker"] },
      status: { $in: ["Verified", "Unverified"] },
    };

    if (workerGroup === "group") {
      filter.role = { $in: ["Agent"] };
    } else if (workerGroup === "individual") {
      filter.role = { $in: ["SelfWorker", "Worker"] };
    }

    if (status) {
      filter.status = {
        $in: Array.isArray(status) ? status : [status],
      };
    }

    if (state && state !== "All") {
      filter.state = state;
    }

    if (city) {
      filter.$or = [
        { district: city },
        { serviceArea: { $in: [city] } },
      ];
    }

    if (block) {
      filter.block = block;
    }

    if (gender) {
      filter.gender = gender;
    }

    // Age filter
    if (minAge || maxAge) {
      const currentYear = new Date().getFullYear();
      const minDOB = maxAge ? currentYear - Number(maxAge) : null;
      const maxDOB = minAge ? currentYear - Number(minAge) : null;

      filter.dob = {};
      if (minDOB !== null) filter.dob.$lte = minDOB;
      if (maxDOB !== null) filter.dob.$gte = maxDOB;

      if (!Object.keys(filter.dob).length) {
        delete filter.dob;
      }
    }

    // workerType expansion
    let allTypes = [];
    if (workerType) {
      const normalizedWorkerType = String(workerType).trim().toLowerCase();

      const mainCategory = categories.find(
        (cat) =>
          String(cat.value).trim().toLowerCase() === normalizedWorkerType ||
          String(cat.label).trim().toLowerCase() === normalizedWorkerType
      );

      if (mainCategory) {
        allTypes = [
          mainCategory.value,
          ...(mainCategory.subcategories || []).map((sub) => sub.value),
        ];
      } else {
        allTypes = [workerType];
      }

      allTypes = allTypes.map((v) => String(v).trim().toLowerCase());
    }

    // First fetch all docs matching base filters
    let agents = await User.find(filter)
      .select(
        "_id name district block profilePhoto status state serviceArea areasOfWork dob veryfiedBage role gender fixedSalary salaryFrom salaryTo workExperience"
      )
      .sort({ createdAt: -1 });

    // Then apply workerType filter in Node
    if (allTypes.length) {
      agents = agents.filter((agent) => {
        // role check optional, mostly unnecessary unless role names are used as worker types
        const normalizedRole = String(agent.role || "").trim().toLowerCase();
        if (allTypes.includes(normalizedRole)) return true;

        if (!agent.areasOfWork || !Array.isArray(agent.areasOfWork)) {
          return false;
        }

        let normalizedAreas = [];

        for (const aw of agent.areasOfWork) {
          try {
            const parsed = JSON.parse(aw);

            if (Array.isArray(parsed)) {
              normalizedAreas.push(
                ...parsed.map((v) => String(v).trim().toLowerCase())
              );
            } else {
              normalizedAreas.push(String(parsed).trim().toLowerCase());
            }
          } catch (e) {
            normalizedAreas.push(String(aw).trim().toLowerCase());
          }
        }

        return normalizedAreas.some((v) => allTypes.includes(v));
      });
    }

    // Total after actual filtering
    const totalCount = agents.length;

    // Pagination after actual filtering
    const skip = (pageNumber - 1) * limitNumber;
    const paginatedAgents = agents.slice(skip, skip + limitNumber);

    return res.status(200).json({
      success: true,
      agents: paginatedAgents,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        hasMore: skip + paginatedAgents.length < totalCount,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching agents:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};


export const getAllAgentsAdmin = async (req, res) => {
  try {
    const { state, city, phone, ids } = req.query;
    // ✅ Base filter: only Verified Agents or SelfWorkers
    const filter = {
      role: { $in: ["Agent", "SelfWorker"] },
      status: "Verified",
    };

    // ✅ If IDs are provided, prioritize fetching by IDs
    if (ids) {
      const idArray = ids.split(",").filter(Boolean);
      if (!idArray.length) {
        return res.status(400).json({
          success: false,
          message: "No valid agent IDs provided",
        });
      }
      filter._id = { $in: idArray };
    } else {
      // ✅ Apply filters dynamically only if ids not provided
      if (state && state !== "All") {
        filter.state = state;
      }

      if (city && city !== "All") {
        filter.$or = [
          { district: city },
          { serviceArea: { $in: [city] } },
        ];
      }

      if (phone) {
        filter.phone = { $regex: phone, $options: "i" };
      }
    }

    // ✅ Fetch matching agents
    const agents = await User.find(filter)
      .select("_id name phone district state block profilePhoto status followupstatus serviceArea veryfiedBage")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    console.error("❌ Error fetching agents:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch agents",
    });
  }
};


export const leadRegister = async (req, res) => {
  const { role, name, phone } = req.body;

  if (!role || !name || !phone) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    const existingLead = await Lead.findOne({ phone });
    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: "Lead with this phone already exists",
      });
    }

    const newLead = new Lead({ role, name, phone });
    await newLead.save();

    res.status(201).json({
      success: true,
      message: "Lead registered successfully",
      data: newLead,
    });
  } catch (error) {
    console.error("Error registering lead:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllLeads = async (req, res) => {
  try {
    const { role, phone, followupstatus } = req.query;

    // Build dynamic query object
    const query = {};
    if (role) query.role = role;
    if (phone) query.phone = { $regex: phone, $options: "i" }; // partial match, case-insensitive
    if (followupstatus) query.status = followupstatus;


    const leads = await Lead.find(query).sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      message: "Leads fetched successfully",
      leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAgentById = async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!agentId) {
      return res.status(400).json({ message: "Missing agentId parameter" });
    }

    // Fetch agent
    const agent = await User.findOne({ _id: agentId, role: "Agent" })
      .select(
        "_id name phone district block state profilePhoto bankDetails totalIncentive availableAmount"
      )
      .lean();

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: "Agent not found",
      });
    }

    // Fetch all transactions
    const transactions = await Payment.find({ agentId }).sort({
      createdAt: -1,
    });

    // Calculate credit and debit totals
    const totalCredit = transactions
      .filter(
        (txn) =>
          txn.paymentType === "credit" && txn.creditStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.amount || 0), 0);

    const totalDebit = transactions
      .filter(
        (txn) =>
          txn.paymentType === "debit" && txn.withdrawalStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.amount || 0), 0);

    const availableAmount = totalCredit - totalDebit;

    const incentiveCreditAmount = transactions
      .filter(
        (txn) =>
          txn.paymentType === "credit" && txn.creditStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.incentiveCharges || 0), 0);

    const incentiveDebitAmount = transactions
      .filter(
        (txn) =>
          txn.paymentType === "debit" && txn.withdrawalStatus === "COMPLETED"
      )
      .reduce((sum, txn) => sum + (txn.incentiveCharges || 0), 0);

    const incentiveAmount = incentiveCreditAmount - incentiveDebitAmount;

    // Filter only debit transactions for history
    const debitTransactions = transactions.filter(
      (txn) =>
        txn.paymentType === "debit" && txn.withdrawalStatus === "COMPLETED"
    );

    return res.status(200).json({
      success: true,
      agent,
      summary: {
        agentId,
        totalCredit,
        totalDebit,
        incentiveDebitAmount,
        availableAmount,
        incentiveAmount,
        debitTransactions,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching agent by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch agent details",
    });
  }
};

export const unlockAgentNumber = async (req, res) => {
  try {
    console.log("Unlock number request by employer:", req.user._id);
    const employerId = req.user._id;
    const { agentId } = req.params;

    // 1️⃣ Validate employer
    const employer = await User.findById(employerId);
    if (!employer) {
      return res.status(404).json({ message: "Employer not found" });
    }

    // 2️⃣ Check subscription
    if (!employer.isSubscribed) {
      return res.status(403).json({
        message: "Please subscribe to unlock contact details",
      });
    }

    // OPTIONAL: credit check
    if (employer.remainingContacts <= 0) {
      return res.status(403).json({
  message: "Your contact limit has been exhausted. Please take a top‑up plan to unlock more contacts. Verification ensures trust and safety for all users.",
});
    }

    // 3️⃣ Get agent
    const agent = await User.findById(agentId).select("phone");
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    // 4️⃣ Deduct credit (IMPORTANT)
    employer.remainingContacts -= 1;
    await employer.save();

    // 5️⃣ Success
    return res.status(200).json({
      success: true,
      phone: agent.phone,
    });
  } catch (error) {
    console.error("Unlock number error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



export const saveWorkerRemark = async (req, res) => {
  try {
    const userId = req.user._id; // from auth middleware
    const { workerId, status } = req.body;

    if (!workerId || !status) {
      return res.status(400).json({
        success: false,
        message: "workerId and status are required",
      });
    }

    const remark = await UserWorkerRemark.findOneAndUpdate(
      { userId, workerId },
      {
        status,
        lastContactedAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.json({
      success: true,
      message: "Remark saved successfully",
      remark,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to save remark",
    });
  }
};
export const getWorkerRemarks = async (req, res) => {
  try {
    const userId = req.user._id;

    const remarks = await UserWorkerRemark.find(
      { userId },
      { workerId: 1, status: 1, _id: 0 }
    ).lean();

    res.json(remarks);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch remarks",
    });
  }
};

