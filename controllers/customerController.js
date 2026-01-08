import db from "../config/db.js";
import bcrypt from "bcrypt";

// 🟢 Lấy danh sách khách hàng
// Lấy danh sách khách hàng có phân trang
export const getCustomers = (req, res) => {
  const page = parseInt(req.query.page) || 1; // Trang hiện tại
  const limit = parseInt(req.query.limit) || 10; // Số bản ghi / trang
  const offset = (page - 1) * limit;

  // Đếm tổng số khách hàng
  const countSql = "SELECT COUNT(*) AS total FROM customers";
  db.query(countSql, (err, countResult) => {
    if (err) return res.status(500).json({ error: err.message });

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // Lấy danh sách khách hàng
    const sql = `SELECT * FROM customers ORDER BY id DESC LIMIT ? OFFSET ?`;
    db.query(sql, [limit, offset], (err, data) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        currentPage: page,
        totalPages,
        totalItems: total,
        limit,
        data,
      });
    });
  });
};

// 🟢 Lấy chi tiết 1 khách hàng theo ID
export const getCustomerById = (req, res) => {
  const customerId = req.params.id;

  const sql = `
    SELECT 
      c.id AS customer_id, c.full_name, c.email, c.phone, c.address, c.status, c.created_at,
      o.id AS order_id, o.total_amount, o.final_amount, o.order_status, o.created_at AS order_date,
      oi.product_id, oi.product_name, oi.color, oi.quantity, oi.price
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE c.id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [customerId], (err, rows) => {
    if (err) return res.status(500).json({ message: "Lỗi truy vấn cơ sở dữ liệu" });
    if (rows.length === 0) return res.status(404).json({ message: "Không tìm thấy khách hàng" });

    // Thông tin khách hàng
    const customerInfo = {
      id: rows[0].customer_id,
      full_name: rows[0].full_name,
      email: rows[0].email,
      phone: rows[0].phone,
      address: rows[0].address,
      status: rows[0].status,
      created_at: rows[0].created_at,
      orders: [],
    };

    // Gom nhóm đơn hàng
    const orderMap = {};

    rows.forEach((r) => {
      if (!r.order_id) return; // Khách chưa có đơn hàng nào

      if (!orderMap[r.order_id]) {
        orderMap[r.order_id] = {
          order_id: r.order_id,
          order_date: r.order_date,
          total_amount: r.total_amount,
          final_amount: r.final_amount,
          order_status: r.order_status,
          items: [],
        };
      }

      if (r.product_id) {
        orderMap[r.order_id].items.push({
          product_id: r.product_id,
          product_name: r.product_name,
          color: r.color,
          quantity: r.quantity,
          price: r.price,
        });
      }
    });

    customerInfo.orders = Object.values(orderMap);

    res.json(customerInfo);
  });
};


// 🟢 Thêm khách hàng mới
export const createCustomer = async (req, res) => {
  try {
    const { full_name, email, phone, address, password } = req.body;

    if (!full_name || !email || !password)
      return res
        .status(400)
        .json({ message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO customers (full_name, email, phone, address, password)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.query(sql, [full_name, email, phone, address, hashedPassword], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        message: "✅ Thêm khách hàng thành công",
        customerId: result.insertId,
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Cập nhật thông tin khách hàng
export const updateCustomer = (req, res) => {
  const customerId = req.params.id;
  const { full_name, email, phone, address, status } = req.body;

  if (!customerId) {
    return res.status(400).json({ message: "Thiếu ID khách hàng" });
  }

  // Validate nhẹ
  if (!full_name || !email || !phone) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
  }

  const sql = `
    UPDATE customers
    SET full_name = ?, email = ?, phone = ?, address = ?, status = ?, updated_at = NOW()
    WHERE id = ?
  `;

  db.query(
    sql,
    [full_name, email, phone, address || "", status || "active", customerId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi server", error: err });

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy khách hàng" });
      }

      // Lấy dữ liệu mới trả về frontend để update UI
      const getUpdatedSql = `
        SELECT id, full_name, email, phone, address, status, created_at, updated_at
        FROM customers WHERE id = ?
      `;

      db.query(getUpdatedSql, [customerId], (err, rows) => {
        if (err)
          return res.status(500).json({ message: "Lỗi server khi lấy dữ liệu" });

        return res.json({
          message: "Cập nhật khách hàng thành công",
          customer: rows[0],
        });
      });
    }
  );
};


// 🟢 Xóa khách hàng
export const deleteCustomer = (req, res) => {
  const customerId = req.params.id;

  // 🟢 Kiểm tra xem khách hàng có đơn hàng nào không
  const checkOrderSql = "SELECT COUNT(*) AS orderCount FROM orders WHERE customer_id = ?";
  db.query(checkOrderSql, [customerId], (err, orderResult) => {
    if (err) return res.status(500).json({ message: "Lỗi kiểm tra đơn hàng" });

    const hasOrders = orderResult[0].orderCount > 0;

    if (hasOrders) {
      return res.status(400).json({
        message: "❌ Không thể xóa khách hàng vì đã có đơn hàng trong hệ thống.",
      });
    }

    // 🟢 Nếu không có đơn hàng → cho phép xóa
    const deleteSql = "DELETE FROM customers WHERE id = ?";
    db.query(deleteSql, [customerId], (err, result) => {
      if (err) return res.status(500).json({ message: "Lỗi khi xóa khách hàng" });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Không tìm thấy khách hàng" });

      res.json({ message: "🗑️ Xóa khách hàng thành công" });
    });
  });
};
export const updateCustomerStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const sql = "UPDATE customers SET status = ? WHERE id = ?";
  db.query(sql, [status, id], (err) => {
    if (err) return res.status(500).json({ message: "Lỗi server" });
    res.json({ message: "Cập nhật trạng thái thành công" });
  });
};



//=============WEB====================
// Lấy danh sách đơn hàng của 1 khách
export const getUserOrders = (req, res) => {
  const { customer_id } = req.params;

  if (!customer_id) {
    return res.status(400).json({ message: "Thiếu customer_id" });
  }

  const orderSql = `
    SELECT *
    FROM orders
    WHERE customer_id = ?
    ORDER BY created_at DESC
  `;

  db.query(orderSql, [customer_id], (err, orders) => {
    if (err) {
      console.error("MySQL error:", err);
      return res.status(500).json({ message: "Lỗi server" });
    }

    if (orders.length === 0) {
      return res.json([]); 
    }

    const orderIds = orders.map((o) => o.id);

    // Lấy chi tiết từng đơn + thông tin sản phẩm
    const detailSql = `
      SELECT oi.*, p.name AS product_name, p.image, p.price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (?)
    `;

    db.query(detailSql, [orderIds], (err, items) => {
      if (err) {
        console.error("MySQL error:", err);
        return res.status(500).json({ message: "Lỗi server" });
      }

      const ordersWithItems = orders.map((order) => ({
        ...order,
        items: items
          .filter((it) => it.order_id === order.id)
          .map((it) => ({
            id: it.id,
            product_id: it.product_id,
            product_name: it.product_name,
            image: it.image,
            price: it.price,
            quantity: it.quantity,
            total: it.price * it.quantity
          })),
      }));

      return res.json(ordersWithItems);
    });
  });
};
