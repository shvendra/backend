import express from "express";
import { addWorkerAttendance, getAttendanceByFilter, updateAttendanceStatus } from "../controllers/attendanceController.js";
import { isAuthenticated } from "../middlewares/auth.js";

const router = express.Router();

router.post("/add-attendance", isAuthenticated, addWorkerAttendance);
router.get("/get-by-requirement", isAuthenticated, getAttendanceByFilter);
router.put("/update-requ", isAuthenticated, updateAttendanceStatus);

export default router;
