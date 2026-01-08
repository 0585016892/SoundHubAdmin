import express from "express";
import db from "../config/db.js"; // mysql2 thường

const router = express.Router();

// Lấy danh sách màu (có phân trang và tìm kiếm)
router.get("/", (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;
  const offset = (page - 1) * limit;
  const searchPattern = `%${search}%`;

  // SQL để lấy dữ liệu
  const sqlData = "SELECT * FROM colors WHERE name LIKE ? OR code LIKE ? ORDER BY id DESC LIMIT ? OFFSET ?";
  // SQL để lấy tổng số bản ghi (dùng cho phân trang)
  const sqlCount = "SELECT COUNT(*) AS total FROM colors WHERE name LIKE ? OR code LIKE ?";

  db.query(sqlData, [searchPattern, searchPattern, parseInt(limit), parseInt(offset)], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });

    // Lấy tổng số bản ghi
    db.query(sqlCount, [searchPattern, searchPattern], (err2, countRows) => {
      if (err2) return res.status(500).json({ message: err2.message });

      const total = countRows[0].total;
      res.json({
        data: rows,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      });
    });
  });
});

// Thêm màu mới
router.post("/", (req, res) => {
  const { name, code } = req.body;
  const sql = "INSERT INTO colors (name, code) VALUES (?, ?)";
  db.query(sql, [name, code], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ id: result.insertId, name, code });
  });
});

// Cập nhật màu
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, code } = req.body;
  const sql = "UPDATE colors SET name = ?, code = ? WHERE id = ?";
  db.query(sql, [name, code, id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ id, name, code });
  });
});

// Xóa màu
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM colors WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: "Deleted successfully" });
  });
});

export default router;
