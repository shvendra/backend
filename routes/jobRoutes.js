import express from "express";
import {
  deleteJob,
  getAllJobs,
  getMyJobs,
  getSingleJob,
  postJob,
  updateJob,
} from "../controllers/jobController.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { authorizeAdminOrSuperAdmin } from "../utils/authorizeAdminOrSuperAdmin.js"; // Assuming you have these middlewares

const router = express.Router();
router.get("/getall", isAuthenticated, authorizeAdminOrSuperAdmin, getAllJobs);
router.post("/post", isAuthenticated, postJob);
router.get("/getmyjobs", isAuthenticated, getMyJobs);
router.put("/update/:id", isAuthenticated, updateJob);
router.delete("/delete/:id", isAuthenticated, deleteJob);
router.get("/:id", isAuthenticated, getSingleJob);

export default router;
