

import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";
import db from "../config/db.js";
import { ioInstance, onlineUsers } from "../socket/notificationSocket.js";
import bcrypt from "bcrypt"; // nếu dùng ES Module

export const createOrder = async (req, res) => {
  const { customer, items, subTotal, shippingFee = 0, discount = 0, total, coupon_code, payment_method, note } = req.body;

  console.log("📦 Dữ liệu từ FE:", { customer, items, subTotal, shippingFee, discount, total, coupon_code, payment_method, note });

  if (!items || items.length === 0) {
    console.log("⚠️ Giỏ hàng trống");
    return res.status(400).json({ message: "Giỏ hàng trống!" });
  }

  try {
    // 1️⃣ Xử lý khách hàng
    console.log("🔍 Kiểm tra khách hàng theo email:", customer.email);
    const [existingCustomer] = await db.promise().query("SELECT id FROM customers WHERE email=?", [customer.email]);
    let customerId;
    let passwordPlain = null;

    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      console.log("✏️ Cập nhật thông tin khách hàng ID:", customerId);
      await db.promise().query(
        "UPDATE customers SET full_name=?, phone=?, address=? WHERE id=?",
        [customer.name, customer.phone, customer.address, customerId]
      );
    } else {
      // Tạo mật khẩu ngẫu nhiên 8 ký tự
      passwordPlain = crypto.randomBytes(4).toString("hex");

      // --- Sử dụng bcrypt để hash ---
      const passwordHash = await bcrypt.hash(passwordPlain, 10); // saltRounds = 10

      const [result] = await db.promise().query(
        "INSERT INTO customers (full_name, email, phone, address, password, status) VALUES (?, ?, ?, ?, ?, 'active')",
        [customer.name, customer.email, customer.phone, customer.address, passwordHash]
      );
      customerId = result.insertId;
      console.log("✅ Tạo khách hàng mới ID:", customerId);
    }

    // 2️⃣ Xử lý coupon
    let discountAmount = discount || 0;
    if (coupon_code) {
      console.log("🏷️ Kiểm tra coupon:", coupon_code);
      const [rows] = await db.promise().query(
        "SELECT * FROM coupons WHERE code=? AND status='active' AND quantity>0",
        [coupon_code]
      );
      if (rows.length > 0) {
        const coupon = rows[0];
        discountAmount = coupon.type === "percent" ? (subTotal * coupon.value) / 100 : coupon.value;
        await db.promise().query("UPDATE coupons SET quantity = quantity - 1 WHERE id=?", [coupon.id]);
        console.log(`🎉 Áp dụng coupon ${coupon_code}, giảm: ${discountAmount}`);
      } else {
        console.log(`⚠️ Coupon không hợp lệ hoặc đã hết: ${coupon_code}`);
        discountAmount = 0;
      }
    }

    // 3️⃣ Tạo đơn hàng
    const finalAmount = total;
    const [orderResult] = await db.promise().query(
      `INSERT INTO orders 
      (customer_id, full_name, email, phone, address, total_amount, discount_amount, final_amount, payment_method, order_status, coupon_code, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [customerId, customer.name, customer.email, customer.phone, customer.address, subTotal, discountAmount, finalAmount, payment_method, coupon_code || null, note || null]
    );

    const orderId = orderResult.insertId;
    console.log("✅ Đơn hàng tạo thành công, Order ID:", orderId);

    // 4️⃣ Thêm chi tiết sản phẩm
    for (const item of items) {
      console.log("🔹 Xử lý sản phẩm:", item.product_name, "Variant ID:", item.variant_id, "Số lượng:", item.quantity);

      let variant = null;

      if (item.variant_id) {
        const [variantRows] = await db.promise().query("SELECT * FROM variants WHERE id=?", [item.variant_id]);
        if (variantRows.length) variant = variantRows[0];
      }

      // Nếu không tìm thấy variant, tạo object tạm cho sản phẩm chính
      if (!variant) {
        variant = {
          id: null,
          product_id: item.product_id,
          name_variant: item.product_name,
          color: item.color || '-',
          power: item.power || '-',
          connection_type: item.connection_type || '-',
          has_microphone: item.has_microphone || 0,
          stock: Infinity // giả định luôn đủ hàng nếu không có variant
        };
      }

      if (variant.stock < item.quantity) {
        console.log(`❌ Sản phẩm ${variant.name_variant} không đủ số lượng`);
        return res.status(400).json({ message: `Sản phẩm ${variant.name_variant} không đủ số lượng` });
      }

      if (variant.id) {
        await db.promise().query("UPDATE variants SET stock = stock - ? WHERE id=?", [item.quantity, variant.id]);
      }

      await db.promise().query(
        `INSERT INTO order_items 
        (order_id, product_id, variant_id, product_name, color, power, connection_type, has_microphone, price, quantity, total) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          variant.product_id,
          variant.id,
          variant.name_variant,
          variant.color,
          variant.power,
          variant.connection_type,
          variant.has_microphone,
          item.price,
          item.quantity,
          item.price * item.quantity
        ]
      );
      console.log(`📦 Thêm sản phẩm vào đơn hàng: ${variant.name_variant}`);
    }

    // 5️⃣ Gửi email nếu khách hàng mới
    let passwordSection = "";
    if (passwordPlain) {
      if (passwordPlain) {
        passwordSection = `
          <p><strong>Thông tin đăng nhập:</strong></p>
          <ul>
            <li><strong>Email:</strong> ${customer.email}</li>
            <li><strong>Mật khẩu:</strong> ${passwordPlain}</li>
          </ul>
          <p>Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu.</p>
        `;
      }}
    let emailContent = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; background: #fff8f0; padding: 20px;">
        
        <h2 style="
          background: linear-gradient(90deg, #ff6a00, #ffcc00);
          -webkit-background-clip: text;
          color: transparent;
          text-align: center;
        ">
          Chào ${customer.name} 👋
        </h2>

        <p style="text-align: center; font-size: 1.1rem;">
          Bạn vừa được tạo tài khoản tại <strong style="color:#ff6a00;">Loa SoundHub</strong> để đặt hàng online.
        </p>

        ${passwordSection || ''}

        <h3 style="
          color: #ff6a00; 
          margin-top: 30px; 
          border-bottom: 2px solid #ff6a00; 
          padding-bottom: 5px;
        ">
          Chi tiết đơn hàng 🛒
        </h3>

        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background: linear-gradient(90deg, #ffe0b2, #ffcc80);">
              <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Sản phẩm</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Màu</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Công suất</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Loại kết nối</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Số lượng</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Giá</th>
              <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Tổng</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#fff3e0' : '#fff0d9'}">
                <td style="border: 1px solid #ddd; padding: 8px;">${item.product_name} ✅</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.color || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.power || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.connection_type || '-'}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price.toLocaleString()}₫</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${(item.price * item.quantity).toLocaleString()}₫</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Tổng tiền hàng:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${subTotal.toLocaleString()}₫</strong></td>
            </tr>
            <tr>
              <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Giảm giá:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${discountAmount.toLocaleString()}₫</strong></td>
            </tr>
            <tr>
              <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Phí vận chuyển:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${shippingFee.toLocaleString()}₫</strong></td>
            </tr>
            <tr style="background: linear-gradient(90deg, #ffe0b2, #ffcc80);">
              <td colspan="6" style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>Thanh toán:</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;"><strong>${total.toLocaleString()}₫</strong></td>
            </tr>
          </tfoot>
        </table>

        <p style="margin-top: 25px; text-align: center; font-size: 1.1rem; color:#ff6a00;">
          Cảm ơn bạn đã đặt hàng tại <strong>Loa SoundHub</strong>! 🎵
        </p>

      </div>
    `;


      await sendEmail(customer.email, "Tài khoản Loa SoundHub và đơn hàng của bạn", emailContent);
      console.log("📧 Email gửi thông tin tài khoản mới cho khách hàng");

    res.status(201).json({ message: "Đặt hàng thành công!", order_id: orderId });

  } catch (err) {
    console.error("❌ Lỗi khi tạo đơn hàng:", err);
    res.status(500).json({ message: "Lỗi server khi tạo đơn hàng" });
  }
};























//==============ADMIN====================

// 🟢 Lấy danh sách đơn hàng
export const getOrders = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search ? `%${req.query.search}%` : "%%";
  const statusFilter = req.query.status || ""; // trạng thái để lọc
  const offset = (page - 1) * limit;

  let countSql = `
    SELECT COUNT(*) AS total
    FROM orders
    WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)
  `;
  let sqlParams = [search, search, search];

  if (statusFilter) {
    countSql += " AND order_status = ?";
    sqlParams.push(statusFilter);
  }

  db.query(countSql, sqlParams, (err, countResult) => {
    if (err) {
      console.error("❌ Lỗi khi đếm đơn hàng:", err);
      return res.status(500).json({ message: "Lỗi khi đếm đơn hàng" });
    }

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    let sql = `
      SELECT id, full_name, email, phone, total_amount, final_amount, order_status, created_at
      FROM orders
      WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)
    `;
    const sqlParamsData = [search, search, search];

    if (statusFilter) {
      sql += " AND order_status = ?";
      sqlParamsData.push(statusFilter);
    }

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    sqlParamsData.push(limit, offset);

    db.query(sql, sqlParamsData, (err, orders) => {
      if (err) {
        console.error("❌ Lỗi khi lấy danh sách đơn hàng:", err);
        return res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng" });
      }

      res.json({
        currentPage: page,
        totalPages,
        totalOrders: total,
        limit,
        data: orders,
      });
    });
  });
};


// 🟢 Lấy chi tiết 1 đơn hàng
export const getOrderById = (req, res) => {
  const { id } = req.params;

  // 🟢 Lấy thông tin đơn hàng
  db.query("SELECT * FROM orders WHERE id = ?", [id], (err, orderResult) => {
    if (err) {
      console.error("❌ Lỗi khi lấy đơn hàng:", err);
      return res.status(500).json({ message: "Lỗi khi lấy đơn hàng" });
    }

    if (orderResult.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const order = orderResult[0];

    // 🟢 Lấy danh sách sản phẩm trong đơn hàng
    db.query("SELECT * FROM order_items WHERE order_id = ?", [id], (err, itemsResult) => {
      if (err) {
        console.error("❌ Lỗi khi lấy chi tiết sản phẩm đơn hàng:", err);
        return res.status(500).json({ message: "Lỗi khi lấy chi tiết sản phẩm đơn hàng" });
      }

      // ✅ Trả về kết quả
      res.json({
        order,
        items: itemsResult,
      });
    });
  });
};


// 🟠 Cập nhật trạng thái đơn hàng
// export const updateOrderStatus = (req, res) => {
//   const { id } = req.params;
//   const { order_status } = req.body; // đúng tên key từ frontend

//   console.log("Updating order:", id, "to status:", order_status);

//   db.query(
//     "UPDATE orders SET order_status=? WHERE id=?",
//     [order_status, id],
//     (err, result) => {
//       if (err) {
//         console.error(err);
//         return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái đơn hàng" });
//       }

//       if (result.affectedRows === 0) {
//         return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
//       }

//       res.json({ message: "Cập nhật trạng thái thành công" });
//     }
//   );
// };
export const updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { order_status } = req.body;

  console.log(`📝 Admin cập nhật đơn hàng ${id} sang trạng thái: ${order_status}`);

  db.query("UPDATE orders SET order_status=? WHERE id=?", [order_status, id], (err, result) => {
    if (err) {
      console.error("❌ Lỗi update đơn hàng:", err);
      return res.status(500).json({ message: "Lỗi khi cập nhật trạng thái đơn hàng" });
    }

    if (result.affectedRows === 0) {
      console.warn(`⚠️ Không tìm thấy đơn hàng ${id}`);
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // Lấy customer_id
    db.query("SELECT customer_id FROM orders WHERE id=?", [id], (err2, rows) => {
      if (err2) {
        console.error("❌ Lỗi lấy customer_id:", err2);
      } else if (rows.length) {
        const customerId = rows[0].customer_id;
        const socketId = onlineUsers.customer[customerId];

        if (socketId && ioInstance) {
          ioInstance.to(socketId).emit("orderStatusUpdated", { orderId: id, order_status });
          console.log(`📨 Đã gửi realtime update trạng thái đơn hàng ${id} tới khách hàng ${customerId} (socket ${socketId})`);
        } else {
          console.log(`ℹ️ Khách hàng ${customerId} không online, bỏ qua emit`);
        }
      }
    });

    res.json({ message: "Cập nhật trạng thái thành công" });
  });
};

// 🔴 Xóa đơn hàng
export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await db.promise().query("DELETE FROM orders WHERE id=?", [id]);
    res.json({ message: "Xóa đơn hàng thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi xóa đơn hàng" });
  }
};

