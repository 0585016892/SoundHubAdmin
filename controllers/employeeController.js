import db from "../config/db.js";
import bcrypt from "bcrypt";

// 🟢 Lấy danh sách nhân viên (phân trang)
export const getEmployees = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const keyword = req.query.keyword ? `%${req.query.keyword}%` : "%";

  // Lấy danh sách nhân viên với filter keyword
  const sql = `
    SELECT * FROM employees 
    WHERE full_name LIKE ? OR email LIKE ?
    ORDER BY id DESC 
    LIMIT ? OFFSET ?
  `;
  db.query(sql, [keyword, keyword, limit, offset], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });

    // Lấy tổng số nhân viên thỏa filter
    const countSql = `
      SELECT COUNT(*) AS total FROM employees 
      WHERE full_name LIKE ? OR email LIKE ?
    `;
    db.query(countSql, [keyword, keyword], (err2, count) => {
      if (err2) return res.status(500).json({ error: err2.message });

      res.json({
        total: count[0].total,
        currentPage: page,
        totalPages: Math.ceil(count[0].total / limit),
        employees: data,
      });
    });
  });
};


// 🟢 Lấy chi tiết nhân viên
export const getEmployeeById = (req, res) => {
  db.query("SELECT * FROM employees WHERE id = ?", [req.params.id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (data.length === 0) return res.status(404).json({ message: "Không tìm thấy nhân viên" });
    res.json(data[0]);
  });
};

// 🟢 Thêm nhân viên mới (có ảnh)
export const createEmployee = async (req, res) => {
  try {
    const { full_name, email, phone, position, department, address, role, password,status } = req.body;
    const avatar = req.file ? req.file.filename : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO employees (full_name, email, phone, position, department, address, role, avatar, password,status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [full_name, email, phone, position, department, address, role, avatar, hashedPassword,status|| 'active'], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "✅ Thêm nhân viên thành công", id: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟡 Cập nhật nhân viên
export const updateEmployee = (req, res) => {
  const { full_name, email, phone, position, department, address, role } = req.body;
  const avatar = req.file ? req.file.filename : req.body.avatar || null;

  const sql = `
    UPDATE employees SET full_name=?, email=?, phone=?, position=?, department=?, address=?, role=?, avatar=?
    WHERE id=?
  `;
  db.query(sql, [full_name, email, phone, position, department, address, role, avatar, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Cập nhật nhân viên thành công" });
  });
};

// 🔴 Xóa nhân viên
export const deleteEmployee = (req, res) => {
  db.query("DELETE FROM employees WHERE id = ?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Xóa nhân viên thành công" });
  });
};
export const updateEmployeeStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const sql = "UPDATE employees SET status = ? WHERE id = ?";
  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    res.json({ message: "Cập nhật trạng thái thành công" });
  });
};
// 🟡 Cập nhật nhân viên
export const updateProfileEmployee = (req, res) => {
  console.log(req.body);
  
  const { full_name, email, phone } = req.body;
  const sql = `
    UPDATE employees SET full_name=?, email=?, phone=?
    WHERE id=?
  `;
  db.query(sql, [full_name, email, phone, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ Cập nhật nhân viên thành công" });
  });
}
// đổi mk 
 export const changePassword = (req, res) => {
  
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Vui lòng nhập mật khẩu hiện tại và mật khẩu mới" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Mật khẩu mới phải từ 6 ký tự trở lên" });
  }

  // Lấy password hiện tại từ DB
  db.query("SELECT password FROM employees WHERE id = ?", [userId], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }
    if (results.length === 0) return res.status(404).json({ message: "Người dùng không tồn tại" });

    const hashPassword = results[0].password;

    // So sánh mật khẩu hiện tại
    bcrypt.compare(currentPassword, hashPassword, (err, isMatch) => {
      if (err) {
        console.error("Bcrypt compare error:", err);
        return res.status(500).json({ message: "Lỗi server" });
      }

      if (!isMatch) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });

      // Hash mật khẩu mới
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Bcrypt hash error:", err);
          return res.status(500).json({ message: "Lỗi server" });
        }

        // Cập nhật DB
        db.query(
          "UPDATE employees SET password = ? WHERE id = ?",
          [hashedPassword, userId],
          (err, result) => {
            if (err) {
              console.error("DB update error:", err);
              return res.status(500).json({ message: "Lỗi server" });
            }

            return res.json({ message: "Đổi mật khẩu thành công" });
          }
        );
      });
    });
  });
};
