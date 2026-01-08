import express from "express";
import db from "../config/db.js"; // mysql2 thường

const router = express.Router();

// GET /api/dashboard
router.get("/", (req, res) => {
  // 1. Info Cards
  db.query("SELECT COUNT(*) AS customerCount FROM customers", (err, customersResult) => {
    if (err) return res.status(500).json({ message: "Lỗi server", err });

    db.query("SELECT COUNT(*) AS orderCount FROM orders", (err, ordersResult) => {
      if (err) return res.status(500).json({ message: "Lỗi server", err });

      db.query("SELECT COUNT(*) AS couponCount FROM coupons", (err, couponsResult) => {
        if (err) return res.status(500).json({ message: "Lỗi server", err });

        db.query("SELECT COUNT(*) AS productCount FROM products", (err, productsResult) => {
          if (err) return res.status(500).json({ message: "Lỗi server", err });

          const infoCards = {
            customers: customersResult[0].customerCount,
            orders: ordersResult[0].orderCount,
            coupons: couponsResult[0].couponCount,
            products: productsResult[0].productCount,
          };

          // 2. Orders per day (last 7 days)
          db.query(`
            SELECT DATE_FORMAT(created_at, '%d-%m') AS date,
                   COUNT(*) AS orders,
                   SUM(total_amount) AS revenue
            FROM orders
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY DATE(created_at)
          `, (err, ordersData) => {
            if (err) return res.status(500).json({ message: "Lỗi server", err });

            // 3. Product categories
            db.query(`
              SELECT c.name, COUNT(p.id) AS value
              FROM categories c
              LEFT JOIN products p ON p.category_id = c.id
              GROUP BY c.id
            `, (err, productCategoriesResult) => {
              if (err) return res.status(500).json({ message: "Lỗi server", err });

              const colors = ["#33a06a", "#ff7f50", "#1e90ff", "#ffcc00"];
              const productCategories = productCategoriesResult.map((item, idx) => ({
                ...item,
                color: colors[idx % colors.length]
              }));

              // 4. Recent orders
              db.query(`
                SELECT id, full_name AS customer, total_amount, order_status
                FROM orders
                ORDER BY created_at DESC
                LIMIT 5
              `, (err, recentOrders) => {
                if (err) return res.status(500).json({ message: "Lỗi server", err });

                res.json({
                  infoCards,
                  ordersData,
                  productCategories,
                  recentOrders,
                });
              });
            });
          });
        });
      });
    });
  });
});

export default router;
