import express from "express";
import db from "../config/db.js"; // MySQL connection

const router = express.Router();

// Lấy lịch sử chat giữa user và admin
router.get("/history/:userId", (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT * FROM messages
    WHERE (sender_type = 'customer' AND sender_id = ?)
       OR (receiver_id = ?)
    ORDER BY created_at ASC
  `;

  db.query(sql, [userId, userId], (err, results) => {
    if (err) {
      console.error("Lỗi lấy lịch sử chat:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    // Chuyển đổi dữ liệu để frontend dễ hiển thị
    const messages = results.map(m => ({
      from: m.sender_type === "admin" ? "admin" : "user",
      text: m.message,
      createdAt: m.created_at,
    }));

    res.json(messages); // trả về mảng messages
  });
});

export default router;
