import express from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  updateCustomerStatus,
  getUserOrders
} from "../controllers/customerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: API quản lý khách hàng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         full_name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         address:
 *           type: string
 *         status:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         full_name: "Nguyễn Văn A"
 *         email: "vana@gmail.com"
 *         phone: "0912345678"
 *         address: "Hà Nội"
 *         status: "active"
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: Lấy danh sách khách hàng
 *     tags: [Customers]
 *     responses:
 *       200:
 *         description: Danh sách khách hàng
 */
router.get("/",authMiddleware, getCustomers);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Lấy chi tiết khách hàng
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Chi tiết khách hàng
 */
router.get("/:id", getCustomerById);

/**
 * @swagger
 * /api/customers:
 *   post:
 *     summary: Thêm khách hàng mới
 *     tags: [Customers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       201:
 *         description: Thêm thành công
 */
router.post("/", createCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   put:
 *     summary: Cập nhật thông tin khách hàng
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Customer'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put("/:id",authMiddleware, updateCustomer);

/**
 * @swagger
 * /api/customers/{id}:
 *   delete:
 *     summary: Xóa khách hàng
 *     tags: [Customers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete("/:id", deleteCustomer);

router.put("/:id/status", updateCustomerStatus);
router.get("/orders/user/:customer_id", getUserOrders);
export default router;
