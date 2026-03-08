import express from "express";
import {
  verifyCaptcha,
  updateFollowUpStatus,
  getCaptcha,
  loginAdmin,
  getAllUsers,
  updateStatus,
  updateLeadStatus,
  updateSourceType,
} from "../controllers/adminController.js";

import {
  getWorkstreamByERN,
  createAgreement,
  getAgreementById,
  signAgreement,
} from "../controllers/agreementController.js";

import { authorizeAdminOrSuperAdmin } from "../utils/authorizeAdminOrSuperAdmin.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

// Existing Routes
router.get("/captcha", getCaptcha);
router.post("/verify-captcha", verifyCaptcha);
router.post("/login", loginAdmin);
router.get("/allUsers", isAuthenticated, authorizeAdminOrSuperAdmin, getAllUsers);
router.put("/:userId/verify", isAuthenticated, authorizeAdminOrSuperAdmin, updateStatus);
router.put("/:userId/followup-status", isAuthenticated, authorizeAdminOrSuperAdmin, updateFollowUpStatus);
router.put("/:userId/update-service-areas", isAuthenticated, authorizeAdminOrSuperAdmin, updateFollowUpStatus);
router.put("/:userId/update-source-type", isAuthenticated, authorizeAdminOrSuperAdmin, updateSourceType);
router.put("/:userId/lead-status", isAuthenticated, authorizeAdminOrSuperAdmin, updateLeadStatus);

// ✅ NEW ROUTES
router.get("/workstreams/:ern", isAuthenticated, getWorkstreamByERN);
router.post("/agreements", isAuthenticated, createAgreement);
router.get("/agreements/:id", getAgreementById); // fetch agreement by ID
router.post("/agreements/:id/sign", signAgreement); // submit signature

export default router;
