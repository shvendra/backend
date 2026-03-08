import { User } from "../models/userSchema.js";
import { catchAsyncErrors } from "./catchAsyncError.js";
import ErrorHandler from "./error.js";
import jwt from "jsonwebtoken";
import UploadLink from "../models/UploadLinkSchema.js";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { token } = req.cookies;
  if (!token) {
    return next(new ErrorHandler("User Not Authorized", 401));
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  req.user = await User.findById(decoded.id);

  next();
});
export const verifyUploadLink = async (req, res, next) => {
  const { token } = req.params;

  const link = await UploadLink.findOne({ token });

  if (!link)
    return res.status(410).json({ success: false, message: "Link expired or invalid" });

  if (link.used)
    return res.status(400).json({ success: false, message: "Link already used" });

  if (link.expiresAt < new Date())
    return res.status(410).json({ success: false, message: "Link expired" });

  req.uploadUserId = link.userId;
  req.uploadLink = link;
  next();
};
