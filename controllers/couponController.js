import db from "../config/db.js";

// 🟢 Lấy danh sách mã giảm giá (có phân trang)
export const getCoupons = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search ? req.query.search.trim() : "";
  const offset = (page - 1) * limit;
  const searchCondition = `%${search}%`;

  // 🟢 Câu SQL lấy danh sách mã giảm giá
  const sqlList = `
    SELECT * FROM coupons
    WHERE code LIKE ? OR description LIKE ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

  // 🟢 Câu SQL đếm tổng số bản ghi
  const sqlCount = `
    SELECT COUNT(*) AS count
    FROM coupons
    WHERE code LIKE ? OR description LIKE ?
  `;

  db.query(sqlList, [searchCondition, searchCondition, limit, offset], (err, rows) => {
    if (err) {
      console.error("❌ Lỗi khi truy vấn danh sách:", err);
      return res.status(500).json({ message: "Lỗi khi lấy danh sách mã giảm giá" });
    }

    const now = new Date();
    let updatePromises = [];

    // ✅ Kiểm tra từng mã để cập nhật trạng thái nếu hết hạn hoặc hết số lượng
    rows.forEach((coupon) => {
      const endDate = new Date(coupon.end_date);
      if (coupon.quantity <= 0 || endDate < now) {
        if (coupon.status !== "inactive") {
          const updateSql = "UPDATE coupons SET status = 'inactive' WHERE id = ?";
          updatePromises.push(
            new Promise((resolve, reject) => {
              db.query(updateSql, [coupon.id], (updateErr) => {
                if (updateErr) return reject(updateErr);
                coupon.status = "inactive"; // cập nhật luôn trong dữ liệu trả về
                resolve();
              });
            })
          );
        }
      }
    });

    // 🟢 Sau khi cập nhật xong thì lấy tổng số bản ghi
    Promise.all(updatePromises)
      .then(() => {
        db.query(sqlCount, [searchCondition, searchCondition], (countErr, countRows) => {
          if (countErr) {
            console.error("❌ Lỗi khi đếm tổng số:", countErr);
            return res.status(500).json({ message: "Lỗi khi đếm số lượng mã giảm giá" });
          }

          const total = countRows[0].count;
          res.json({
            data: rows,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
          });
        });
      })
      .catch((updateError) => {
        console.error("❌ Lỗi khi cập nhật trạng thái:", updateError);
        res.status(500).json({ message: "Lỗi khi cập nhật trạng thái mã giảm giá" });
      });
  });
};



// 🟢 Lấy chi tiết mã giảm giá
export const getCouponById = (req, res) => {
  const sql = "SELECT * FROM coupons WHERE id = ?";
  db.query(sql, [req.params.id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (data.length === 0) return res.status(404).json({ message: "Không tìm thấy" });
    res.json(data[0]);
  });
};

// 🟢 Thêm mã giảm giá
export const createCoupon = (req, res) => {
  console.log("gọi api");
  console.log(req.body);
  const {
    code,
    description,
    type,
    value,
    min_order_value,
    start_date,
    end_date,
    quantity,
    apply_to,
    status,
  } = req.body;

  const sql = `
    INSERT INTO coupons 
    (code, description, type, value, min_order_value, start_date, end_date, quantity, apply_to, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [code, description, type, value, min_order_value, start_date, end_date, quantity, apply_to, status],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Thêm mã giảm giá thành công", id: result.insertId });
    }
  );
};

// 🟢 Cập nhật mã giảm giá
export const updateCoupon = (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const sql = "UPDATE coupons SET ? WHERE id = ?";
  db.query(sql, [data, id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Cập nhật mã giảm giá thành công" });
  });
};

// 🟢 Xóa mã giảm giá
export const deleteCoupon = (req, res) => {
  const sql = "DELETE FROM coupons WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Xóa mã giảm giá thành công" });
  });
};
