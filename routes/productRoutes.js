import express from "express";
import upload from "../middleware/upload.js";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductDetail,
  getProductsCus,
  getProductDetailCus,
  searchProducts ,getHotProducts,getFeaturedProducts
} from "../controllers/productController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: API quản lý sản phẩm
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: integer
 *           description: ID sản phẩm tự tăng
 *         name:
 *           type: string
 *           description: Tên sản phẩm
 *         slug:
 *           type: string
 *           description: Đường dẫn (slug)
 *         description:
 *           type: string
 *           description: Mô tả sản phẩm
 *         price:
 *           type: number
 *           description: Giá sản phẩm
 *         image:
 *           type: string
 *           description: Tên file ảnh hoặc đường dẫn ảnh
 *         brand:
 *           type: string
 *           description: Thương hiệu
 *         color:
 *           type: string
 *           description: Màu sắc
 *         size:
 *           type: string
 *           description: Kích cỡ
 *         status:
 *           type: string
 *           description: Trạng thái sản phẩm
 *       example:
 *         id: 1
 *         name: "Loa Bluetooth JBL Charge 5"
 *         slug: "loa-bluetooth-jbl-charge-5"
 *         description: "Loa JBL Charge 5 chống nước, pin 20 giờ, âm bass mạnh mẽ."
 *         price: 3200000
 *         image: "jbl-charge5.jpg"
 *         brand: "JBL"
 *         color: "Đen, Xanh"
 *         size: "Nhỏ"
 *         status: "Đang hoạt động"
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Lấy danh sách sản phẩm
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Danh sách sản phẩm
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Lấy chi tiết sản phẩm theo ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID sản phẩm
 *     responses:
 *       200:
 *         description: Thông tin chi tiết sản phẩm
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.get("/:id", getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Thêm sản phẩm mới (có upload ảnh)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *               brand:
 *                 type: string
 *               color:
 *                 type: string
 *               size:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thêm sản phẩm thành công
 *       400:
 *         description: Lỗi dữ liệu gửi lên
 */
router.post("/", upload.single("image"), createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Cập nhật sản phẩm (có thể thay ảnh)
 *     tags: [Products]
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
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               image:
 *                 type: string
 *                 format: binary
 *               brand:
 *                 type: string
 *               color:
 *                 type: string
 *               size:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật sản phẩm thành công
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.put("/:id", upload.single("image"), updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Xóa sản phẩm theo ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy sản phẩm
 */
router.delete("/:id", deleteProduct);
router.get("/productdetail/:id", getProductDetail);
router.get("/a/filter", getProductsCus);
router.get("/v1/productdetail/:slug", getProductDetailCus);
router.get("/v1/search", searchProducts);
router.get("/v1/hot", getHotProducts);
router.get("/v1/featured", getFeaturedProducts);
export default router;
