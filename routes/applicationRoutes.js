import express from "express";
import {
  insertRequirement,
  getFilteredRequirements,
  getFilteredRequirementsAdmin,
  assignAgentToRequirement,
  expressInterest,
  UnassignOrAcceptAgentToRequirement,
  getRequirements,
  updateRequirementStatusUpdate,
  updateRequirementRemarks,
  updateRequirementType
} from "../controllers/requirementController.js";
import { isAuthenticated,  } from "../middlewares/auth.js";
import { authorizeAdminOrSuperAdmin } from "../utils/authorizeAdminOrSuperAdmin.js";

const router = express.Router();

router.post("/insert", isAuthenticated, insertRequirement);
router.get("/", isAuthenticated, getFilteredRequirements);
router.get("/admin", isAuthenticated, authorizeAdminOrSuperAdmin, getFilteredRequirementsAdmin);
router.put("/assign", isAuthenticated, assignAgentToRequirement);
router.put("/unassignOrAccept", isAuthenticated, UnassignOrAcceptAgentToRequirement);
router.post("/:id/express-interest", isAuthenticated, expressInterest);
router.get("/getworkhistory", isAuthenticated, getRequirements);
router.put("/update-status", isAuthenticated, updateRequirementStatusUpdate);
router.put("/update-reqtype", isAuthenticated, updateRequirementType);
router.put("/update-stream-moreinfo", isAuthenticated, updateRequirementRemarks);

export default router;
