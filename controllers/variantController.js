import db from "../config/db.js";

// 🟢 Lấy danh sách biến thể (có phân trang + lọc theo product_id)
export const getVariants = (req, res) => {
  try {
    const { product_id, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];

    let countSql = "SELECT COUNT(*) AS total FROM variants";
    let sql = "SELECT * FROM variants";

    if (product_id) {
      countSql += " WHERE product_id = ?";
      sql += " WHERE product_id = ?";
      params.push(product_id);
    }

    db.query(countSql, params, (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
      db.query(sql, [...params, parseInt(limit), parseInt(offset)], (err, data) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          currentPage: parseInt(page),
          totalPages,
          total,
          data,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Thêm biến thể
export const createVariant = (req, res) => {
  console.log("Received body:", req.body);
  try {
    const { product_id, name_variant, color, power, connection_type, has_microphone, price, stock } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!product_id || !name_variant || !price)
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });

    const sql = `
      INSERT INTO variants 
      (product_id, name_variant, color, power, connection_type, has_microphone, price, stock, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [product_id, name_variant, color, power, connection_type, has_microphone, price, stock, image], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "✅ Thêm biến thể thành công", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Cập nhật biến thể
export const updateVariant = (req, res) => {
  try {
    const { id } = req.params;
    const { name_variant, color, power, connection_type, has_microphone, price, stock } = req.body;
    const image = req.file ? req.file.filename : null;

    const sql = `
      UPDATE variants 
      SET name_variant=?, color=?, power=?, connection_type=?, has_microphone=?, price=?, stock=?, image=IFNULL(?, image), updated_at=NOW()
      WHERE id=?
    `;
    db.query(sql, [name_variant, color, power, connection_type, has_microphone, price, stock, image, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Cập nhật biến thể thành công" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Xóa biến thể
export const deleteVariant = (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM variants WHERE id=?";
    db.query(sql, [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "🗑️ Xóa biến thể thành công" });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
