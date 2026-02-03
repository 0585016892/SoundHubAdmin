import db from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// 🟢 Đăng ký user
export const register = (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: "Thiếu dữ liệu" });

  const checkSql = "SELECT id FROM employees WHERE email = ? OR full_name = ?";
  db.query(checkSql, [email, username], async (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (results.length > 0) return res.status(400).json({ message: "User đã tồn tại" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertSql = "INSERT INTO employees (full_name, email, password) VALUES (?, ?, ?)";
    db.query(insertSql, [username, email, hashedPassword], (err2) => {
      if (err2) return res.status(500).json({ message: "Lỗi server" });
      res.json({ message: "Đăng ký thành công" });
    });
  });
};

// 🟢 Đăng nhập user
export const login = (req, res) => {
  console.log(req.body);
  
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Thiếu dữ liệu đăng nhập" });

  const sql = "SELECT * FROM employees WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    if (results.length === 0)
      return res.status(400).json({ message: "Email chưa được đăng ký" });

    const user = results[0];

    // 🟡 Kiểm tra trạng thái tài khoản
    if (user.status !== "active") {
      return res.status(403).json({ message: "Tài khoản của bạn đã bị khóa hoặc chưa được kích hoạt" });
    }

    // 🟢 Kiểm tra mật khẩu
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Mật khẩu không chính xác" });

    // 🟢 Tạo token JWT
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "secretkey",
      { expiresIn: "1d" }
    );

    // 🟢 Trả kết quả
    res.json({
      message: "Đăng nhập thành công",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        position: user.position,
        address: user.address,
        department: user.department,
        status: user.status,
      },
      token,
    });
  });
};
// 🟢 Cập nhật mật khẩu
export const updatePassword = (req, res) => {
  const userId = req.user.id; // từ verifyToken
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: "Thiếu dữ liệu" });

  const sql = "SELECT password FROM users WHERE id = ?";
  db.query(sql, [userId], async (err, results) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    const user = results[0];
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (err2) => {
      if (err2) return res.status(500).json({ message: "Lỗi server" });
      res.json({ message: "Cập nhật mật khẩu thành công" });
    });
  });
};

// 🟢 Logout (xóa refresh token nếu có)
export const logout = (req, res) => {
  const userId = req.user.id;
  // Xóa refresh_token trong DB
  db.query("UPDATE users SET refresh_token = NULL WHERE id = ?", [userId], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    res.json({ message: "Logout thành công" });
  });
};





//==============Khách hàng================
// --- Đăng ký ---
export const registerCustomer = async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const [existing] = await db.promise().query("SELECT id FROM customers WHERE email=?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email đã tồn tại" });
    }

    const passwordHash = await bcrypt.hash(password, 10); // hash với 10 rounds
    const [result] = await db.promise().query(
      "INSERT INTO customers (name, email, phone, password, status) VALUES (?, ?, ?, ?, 'active')",
      [name, email, phone, passwordHash]
    );

    const user = { id: result.insertId, name, email, phone };
    res.status(201).json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- Đăng nhập ---
export const loginCustomer = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.promise().query("SELECT * FROM customers WHERE email=?", [email]);
    if (rows.length === 0) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

    const user = rows[0];

    // Kiểm tra status
    if (user.status !== "active") return res.status(403).json({ message: "Tài khoản đang bị khóa" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,  // dùng biến môi trường
        { expiresIn: "7d" }
      );    
      res.json({ user: { 
            id: user.id,
            name: user.full_name,
              email: user.email,
              phone: user.phone, 
              address: user.address, 
              status: user.status, 
              }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- Lấy profile ---
export const getProfileCustomer = async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT id, name, email, phone FROM customers WHERE id=?", [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- Cập nhật profile ---
export const updateProfileCustomer = async (req, res) => {
  const { name, phone } = req.body;
  try {
    await db.promise().query("UPDATE customers SET full_name=?, phone=? WHERE id=?", [name, phone, req.user.id]);
    res.json({ user: { id: req.user.id, name, phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// --- Đổi mật khẩu ---
export const changePasswordCustomer = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  try {
    const [rows] = await db.promise().query("SELECT password FROM customers WHERE id=?", [req.user.id]);
    const currentHash = rows[0].password;

    const isMatch = await bcrypt.compare(oldPassword, currentHash);
    if (!isMatch) return res.status(400).json({ message: "Mật khẩu cũ không đúng" });

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.promise().query("UPDATE customers SET password=? WHERE id=?", [newHash, req.user.id]);
    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};