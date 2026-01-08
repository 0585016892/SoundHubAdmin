import express from "express";
import { 
  register, 
  login,
  loginCustomer,
  registerCustomer,
  getProfileCustomer,
  updateProfileCustomer,
  changePasswordCustomer
} from "../controllers/authController.js";

import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

//==========Khách hàng============
router.post("/customer/register", registerCustomer);
router.post("/customer/login", loginCustomer);

// Lấy thông tin profile (cần token)
router.get("/customer/profile", authMiddleware, getProfileCustomer);

// Cập nhật profile (cần token)
router.put("/customer/profile", authMiddleware, updateProfileCustomer);

// Đổi mật khẩu (cần token)
router.post("/customer/change-password", authMiddleware, changePasswordCustomer);

export default router;
