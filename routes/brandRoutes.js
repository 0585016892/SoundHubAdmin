import express from "express";
import upload from "../middleware/upload.js";
import {
  getBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brandController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Brands
 *   description: API quản lý thương hiệu sản phẩm
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Brand:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: integer
 *           description: ID thương hiệu tự tăng
 *         name:
 *           type: string
 *           description: Tên thương hiệu
 *         logo:
 *           type: string
 *           description: Đường dẫn hoặc tên file logo
 *         description:
 *           type: string
 *           description: Mô tả ngắn về thương hiệu
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *       example:
 *         id: 1
 *         name: "JBL"
 *         logo: "jbl.png"
 *         description: "Thương hiệu loa nổi tiếng của Mỹ"
 */

/**
 * @swagger
 * /api/brands:
 *   get:
 *     summary: Lấy danh sách thương hiệu
 *     tags: [Brands]
 *     responses:
 *       200:
 *         description: Danh sách thương hiệu sản phẩm
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Brand'
 */
router.get("/", getBrands);

/**
 * @swagger
 * /api/brands/{id}:
 *   get:
 *     summary: Lấy chi tiết thương hiệu theo ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thông tin chi tiết thương hiệu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Brand'
 *       404:
 *         description: Không tìm thấy thương hiệu
 */
router.get("/:id", getBrandById);

/**
 * @swagger
 * /api/brands:
 *   post:
 *     summary: Thêm thương hiệu mới
 *     tags: [Brands]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Thêm thương hiệu thành công
 *       400:
 *         description: Lỗi dữ liệu gửi lên
 */
router.post("/", upload.single("logo"), createBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   put:
 *     summary: Cập nhật thông tin thương hiệu
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Cập nhật thương hiệu thành công
 *       404:
 *         description: Không tìm thấy thương hiệu
 */
router.put("/:id", upload.single("logo"), updateBrand);

/**
 * @swagger
 * /api/brands/{id}:
 *   delete:
 *     summary: Xóa thương hiệu theo ID
 *     tags: [Brands]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thương hiệu thành công
 *       404:
 *         description: Không tìm thấy thương hiệu
 */
router.delete("/:id", deleteBrand);

export default router;
