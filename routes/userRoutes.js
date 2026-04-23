import express from "express";
import { updateEmployerAgentPaymentVerifiedBadgeStatus,  saveWorkerRemark, getWorkerRemarks, generateUploadLink, uploadKycDocuments, unlockAgentNumber, getUsersByReferredBy, getUserByRole, getAllAgentsAdmin, getAgentById, leadRegister, login, register, logout, getUser, updateUser, getAgents, updatePassword, getAllLeads } from "../controllers/userController.js";
import { isAuthenticated, verifyUploadLink } from "../middlewares/auth.js";
import { authorizeAdminOrSuperAdmin } from "../utils/authorizeAdminOrSuperAdmin.js";
import { setRole } from "../controllers/userController.js";

const router = express.Router();
router.post("/lead-register", leadRegister);
router.post("/register", register);
router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.get("/getuser", isAuthenticated, getUser);
router.put("/update", isAuthenticated, updateUser);
router.get("/getAllAgents", getAgents);
router.get("/getAllAgentsAdmin", isAuthenticated, getAllAgentsAdmin);
router.get("/leads", isAuthenticated, authorizeAdminOrSuperAdmin, getAllLeads);
router.put("/update/password", updatePassword);
router.get("/agent/:agentId", isAuthenticated, getAgentById);
router.get("/getuserbyrole", isAuthenticated, getUserByRole);
router.post("/setrole", isAuthenticated, setRole);
router.post(
  "/updatePaymentStatus",
  isAuthenticated, // ✅ MUST BE FIRST
  authorizeAdminOrSuperAdmin,
  updateEmployerAgentPaymentVerifiedBadgeStatus
);
router.get("/referred", isAuthenticated, getUsersByReferredBy);
router.get(
  "/unlock-number/:agentId",
  isAuthenticated,
  unlockAgentNumber
);
router.post(
  "/generate-upload-link",
  isAuthenticated,
  generateUploadLink
);

router.put(
  "/upload-kyc/:token",
  verifyUploadLink,
  uploadKycDocuments
);
/**
 * Worker remark APIs
 */
router.post(
  "/worker-remark",
  isAuthenticated,
  saveWorkerRemark
);

router.get(
  "/worker-remarks",
  isAuthenticated,
  getWorkerRemarks
);
export default router;
