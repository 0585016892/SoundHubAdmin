import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { updatePassword, logout } from "../controllers/authController.js"; 
const router = express.Router();

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "Thông tin user", user: req.user });
});
// Update password
router.put("/update-password", authMiddleware, updatePassword);

// Logout
router.post("/logout", authMiddleware, logout);
export default router;
