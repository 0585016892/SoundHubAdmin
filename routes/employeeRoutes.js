import express from "express";
import upload from "../middleware/upload.js";
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  updateProfileEmployee,
  changePassword
} from "../controllers/employeeController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", getEmployees);
router.get("/:id", getEmployeeById);
router.post("/", upload.single("avatar"), createEmployee);
router.put("/:id", upload.single("avatar"), updateEmployee);
router.delete("/:id", deleteEmployee);
router.put("/:id/status", updateEmployeeStatus);
router.put("/:id/profile", updateProfileEmployee);
router.put("/change-password", authMiddleware, changePassword);
export default router;
