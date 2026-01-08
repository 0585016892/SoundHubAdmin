import db from "../config/db.js";

// 🟢 Lấy tất cả loại sản phâm
export const getCategory = (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%%";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Đếm tổng số brand (có áp dụng tìm kiếm)
    const countSql = "SELECT COUNT(*) AS total FROM categories WHERE name LIKE ?";
    db.query(countSql, [search], (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Lấy danh sách brand theo trang
      const sql = `
        SELECT * 
        FROM categories 
        WHERE name LIKE ? 
        ORDER BY id DESC 
        LIMIT ? OFFSET ?
      `;

      db.query(sql, [search, limit, offset], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          currentPage: page,
          totalPages,
          totalBrands: total,
          limit,
          data: results,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 🟢 Lấy chi tiết loại sản phâm
export const getCategoryById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM categories WHERE id = ?";
  db.query(sql, [id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (data.length === 0)
      return res.status(404).json({ message: "Không tìm thấy loại sản phâm" });
    res.json(data[0]);
  });
};

// 🟢 Thêm loại sản phâm
export const createCategory = (req, res) => {
  console.log(req.body);
  
  try {
    const { name, slug, description, status } = req.body;
    const image = req.file ? `${req.file.filename}` : null;

    if (!name || !slug)
      return res.status(400).json({ message: "Vui lòng nhập tên và slug" });

    const sql = `
      INSERT INTO categories (name, slug, image, description, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, slug, image, description, status || 'active'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "✅ Thêm loại sản phẩm thành công", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Cập nhật loại sản phâm
export const updateCategory = (req, res) => {
  const { id } = req.params;
  const { name, slug, description, status } = req.body;
  const image = req.file ? `${req.file.filename}` : req.body.logo;

  const sql = `
    UPDATE categories
    SET name=?, slug=?, image=?, origin=?, description=?, status=?
    WHERE id=?
  `;
  db.query(sql, [name, slug, image, description, status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Cập nhật loại sản phâm thành công" });
  });
};

// 🟢 Xóa loại sản phâm
export const deleteCategory = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM categories WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Xóa loại sản phâm thành công" });
  });
};
