import express from "express";
import db from "../config/db.js"; // mysql2 thường, không promise

const router = express.Router();

// Hàm parse ngày
const parseDate = (dateStr, defaultValue) => {
  return dateStr ? dateStr : defaultValue;
};

/**
 * Doanh thu theo ngày/tháng/năm
 * GET /api/statistics/revenue?type=day|month|year&start_date&end_date
 */
router.get("/revenue", (req, res) => {
  const { type, start_date, end_date } = req.query;
  const start = parseDate(start_date, "2000-01-01");
  const end = parseDate(end_date, new Date().toISOString().slice(0,10));

  let sql = "";
  switch (type) {
    case "day":
      sql = `
        SELECT DATE(created_at) as period, SUM(total_amount) as revenue
        FROM orders
        WHERE order_status='completed' AND created_at BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at) ASC`;
      break;
    case "month":
      sql = `
        SELECT DATE_FORMAT(created_at,'%Y-%m') as period, SUM(total_amount) as revenue
        FROM orders
        WHERE order_status='completed' AND created_at BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(created_at,'%Y-%m')
        ORDER BY DATE_FORMAT(created_at,'%Y-%m') ASC`;
      break;
    case "year":
      sql = `
        SELECT YEAR(created_at) as period, SUM(total_amount) as revenue
        FROM orders
        WHERE status='completed' AND created_at BETWEEN ? AND ?
        GROUP BY YEAR(created_at)
        ORDER BY YEAR(created_at) ASC`;
      break;
    default:
      return res.status(400).json({ message: "Invalid type" });
  }

  db.query(sql, [start, end], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi khi lấy doanh thu" });
    }
    res.json(rows);
  });
});

/**
 * Top sản phẩm bán chạy
 */
router.get("/top-products", (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const start = parseDate(req.query.start_date, "2000-01-01");
  const end = parseDate(req.query.end_date, new Date().toISOString().slice(0,10));

  const sql = `
    SELECT p.id, p.name, SUM(oi.quantity) as sold_quantity
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_status='completed' AND o.created_at BETWEEN ? AND ?
    GROUP BY p.id
    ORDER BY sold_quantity DESC
    LIMIT ?`;

  db.query(sql, [start, end, limit], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi khi lấy sản phẩm bán chạy" });
    }
    res.json(rows);
  });
});

/**
 * Khách hàng mới và trung thành
 */
router.get("/customers", (req, res) => {
  const start = parseDate(req.query.start_date, "2000-01-01");
  const end = parseDate(req.query.end_date, new Date().toISOString().slice(0,10));

  const sqlNew = `
    SELECT COUNT(*) as new_customers
    FROM customers
    WHERE created_at BETWEEN ? AND ?`;

  const sqlTop = `
    SELECT c.id, c.full_name, c.email, COUNT(o.id) as total_orders
    FROM customers c
    JOIN orders o ON c.id = o.customer_id
    WHERE o.order_status='completed' AND o.created_at BETWEEN ? AND ?
    GROUP BY c.id
    ORDER BY total_orders DESC
    LIMIT 5`;

  db.query(sqlNew, [start, end], (err, newRows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi khi lấy khách hàng mới" });
    }

    db.query(sqlTop, [start, end], (err, topRows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Lỗi khi lấy khách hàng trung thành" });
      }

      res.json({
        newCustomers: newRows[0].new_customers,
        topCustomers: topRows
      });
    });
  });
});

/**
 * Sản phẩm tồn kho thấp
 */
router.get("/stock", (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;

  const sql = `
    SELECT id, product_id, name_variant, stock
  FROM variants
  WHERE stock <= ?
  ORDER BY stock ASC`;

  db.query(sql, [threshold], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi khi lấy tồn kho" });
    }
    res.json(rows);
  });
});

/**
 * Thống kê coupon
 */
router.get("/coupons", (req, res) => {
  // parseDate là hàm bạn đã dùng để xử lý ngày, vd: parseDate(query, defaultValue)
  const start = parseDate(req.query.start_date, "2025-01-01");
  const end = parseDate(req.query.end_date, new Date().toISOString().slice(0, 10));

  const sql = `
    SELECT code, quantity, start_date, end_date, status
    FROM coupons
    WHERE end_date BETWEEN ? AND ?
  `;

  db.query(sql, [start, end], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Lỗi khi lấy coupon" });
    }
    res.json(rows);
  });
});


export default router;
