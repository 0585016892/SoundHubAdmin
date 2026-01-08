import db from "../config/db.js";

// 🟢 Lấy tất cả thương hiệu
export const getBrands = (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search}%` : "%%";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Đếm tổng số brand (có áp dụng tìm kiếm)
    const countSql = "SELECT COUNT(*) AS total FROM brands WHERE name LIKE ?";
    db.query(countSql, [search], (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Lấy danh sách brand theo trang
      const sql = `
        SELECT * 
        FROM brands 
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


// 🟢 Lấy chi tiết thương hiệu
export const getBrandById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM brands WHERE id = ?";
  db.query(sql, [id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (data.length === 0)
      return res.status(404).json({ message: "Không tìm thấy thương hiệu" });
    res.json(data[0]);
  });
};

// 🟢 Thêm thương hiệu
export const createBrand = (req, res) => {
  console.log(req.body);
  
  try {
    const { name, slug, origin, description, status } = req.body;
    const logo = req.file ? `${req.file.filename}` : null;

    if (!name || !slug)
      return res.status(400).json({ message: "Vui lòng nhập tên và slug" });

    const sql = `
      INSERT INTO brands (name, slug, logo, origin, description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, slug, logo, origin, description, status || 'active'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "✅ Thêm thương hiệu thành công", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Cập nhật thương hiệu
export const updateBrand = (req, res) => {
  const { id } = req.params;
  const { name, slug, origin, description, status } = req.body;
  const logo = req.file ? `${req.file.filename}` : req.body.logo;

  const sql = `
    UPDATE brands
    SET name=?, slug=?, logo=?, origin=?, description=?, status=?
    WHERE id=?
  `;
  db.query(sql, [name, slug, logo, origin, description, status, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Cập nhật thương hiệu thành công" });
  });
};

// 🟢 Xóa thương hiệu
export const deleteBrand = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM brands WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Xóa thương hiệu thành công" });
  });
};
