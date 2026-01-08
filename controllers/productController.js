import db from "../config/db.js";
import fs from "fs";

// 🟢 Lấy danh sách sản phẩm
export const getProducts = (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const category_id = req.query.category_id || "";
    const brand_id = req.query.brand_id || "";
    const status = req.query.status || "";

    // Build điều kiện lọc
    let whereClauses = [];
    let params = [];

    if (search) {
      whereClauses.push("p.name LIKE ?");
      params.push(`%${search}%`);
    }
    if (category_id) {
      whereClauses.push("p.category_id = ?");
      params.push(category_id);
    }
    if (brand_id) {
      whereClauses.push("p.brand_id = ?");
      params.push(brand_id);
    }
    if (status) {
      whereClauses.push("p.status = ?");
      params.push(status);
    }

    const whereSql = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) AS total FROM products p ${whereSql}`;
    db.query(countQuery, params, (err, countResult) => {
      if (err) return res.status(500).json({ error: err.message });

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT 
          p.*,
          b.name AS brand_name,
          c.name AS category_name,
          cp.code AS coupon_code,
          cp.type,
          cp.value
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN coupons cp ON p.coupon_id = cp.id
        ${whereSql}
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
      `;

      db.query(dataQuery, [...params, limit, offset], (err, products) => {
        if (err) return res.status(500).json({ error: err.message });

        if (products.length === 0) {
          return res.json({
            currentPage: page,
            totalPages,
            totalProducts: total,
            limit,
            data: [],
          });
        }

        const productIds = products.map(p => p.id);
        const variantsQuery = `SELECT * FROM variants WHERE product_id IN (?)`;
        db.query(variantsQuery, [productIds], (err, variants) => {
          if (err) return res.status(500).json({ error: err.message });

          const productsWithVariants = products.map(p => ({
            ...p,
            variants: variants.filter(v => v.product_id === p.id)
          }));

          res.json({
            currentPage: page,
            totalPages,
            totalProducts: total,
            limit,
            data: productsWithVariants,
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟢 Lấy chi tiết 1 sản phẩm
export const getProductById = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM products WHERE id = ?";
  db.query(sql, [id], (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    if (data.length === 0) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.json(data[0]);
  });
};

// 🟢 Thêm sản phẩm (có upload ảnh)
export const createProduct = (req, res) => {
  try {
    const { name, slug, description, price, status, brand_id, category_id, coupon_id } = req.body;
    const image = req.file ? req.file.filename : null;

    if (!name || !slug || !price)
      return res.status(400).json({ message: "Vui lòng nhập đủ thông tin sản phẩm" });

    const sql = `
      INSERT INTO products (name, slug, description, price, image, status, brand_id, category_id, coupon_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [name, slug, description, price, image, status, brand_id, category_id, coupon_id || null], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "✅ Thêm sản phẩm thành công", productId: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 🟡 Cập nhật sản phẩm (có thể thay ảnh)
export const updateProduct = (req, res) => {
  const { id } = req.params;
  const { name, slug, description, price, status, brand_id, category_id } = req.body;
  const newImage = req.file ? req.file.filename : null;

  // Lấy ảnh cũ để xóa file nếu có thay mới
  db.query("SELECT image FROM products WHERE id = ?", [id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const oldImage = result[0].image;

    let sql = `
      UPDATE products
      SET name=?, slug=?, description=?, price=?, status=?, brand_id=?, category_id=?`;
    const values = [name, slug, description, price, status, brand_id, category_id];

    if (newImage) {
      sql += `, image=?`;
      values.push(newImage);

      // Xóa ảnh cũ
      if (oldImage && fs.existsSync(`uploads/products/${oldImage}`)) {
        fs.unlinkSync(`uploads/products/${oldImage}`);
      }
    }

    sql += ` WHERE id=?`;
    values.push(id);

    db.query(sql, values, (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: "✅ Cập nhật sản phẩm thành công" });
    });
  });
};

// 🔴 Xóa sản phẩm
export const deleteProduct = (req, res) => {
  const { id } = req.params;

  db.query("SELECT image FROM products WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const image = result[0].image;

    db.query("DELETE FROM products WHERE id = ?", [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });

      if (image && fs.existsSync(`uploads/products/${image}`)) {
        fs.unlinkSync(`uploads/products/${image}`);
      }

      res.json({ message: "🗑️ Đã xóa sản phẩm thành công" });
    });
  });
};
// GET /api/products/:id
export const getProductDetail = (req, res) => {
    const productId = req.params.id;

    const sql = `
        SELECT 
            p.id AS product_id,
            p.name,
            p.slug,
            p.description,
            p.price,
            p.image,
            p.status,

            v.id AS variant_id,
            v.name_variant,
            v.color,
            v.power,
            v.connection_type,
            v.has_microphone,
            v.price AS variant_price,
            v.stock,
            v.image AS variant_image
        FROM products p
        LEFT JOIN variants v ON p.id = v.product_id
        WHERE p.id = ?
    `;

    db.query(sql, [productId], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "Lỗi server", err });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Gom dữ liệu thủ công
        const product = {
            id: rows[0].product_id,
            name: rows[0].name,
            slug: rows[0].slug,
            description: rows[0].description,
            price: rows[0].price,
            image: rows[0].image,
            status: rows[0].status,
            variants: []
        };

        rows.forEach(r => {
            if (r.variant_id) {
                product.variants.push({
                    id: r.variant_id,
                    name_variant: r.name_variant,
                    color: r.color,
                    power: r.power,
                    connection_type: r.connection_type,
                    has_microphone: r.has_microphone,
                    price: r.variant_price,
                    stock: r.stock,
                    image: r.variant_image
                });
            }
        });

        res.json(product);
    });
};



//=============WEB========================
// GET /api/products
// Lấy danh sách sản phẩm có filter
export const getProductsCus = async (req, res) => {
  try {
    let {
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 9,
    } = req.query;


    page = Number(page);
    limit = Number(limit);
    const offset = (page - 1) * limit;

    // ---------------------------
    //  Lấy category_id từ slug
    // ---------------------------
    let categoryId = null;
    if (category) {
      const [catRows] = await db
        .promise()
        .query("SELECT id FROM categories WHERE slug = ?", [category]);


      if (catRows.length === 0) {
        return res.status(404).json({ message: "Category not found" });
      }

      categoryId = catRows[0].id;
    }

    // ---------------------------
    //  Lấy brand_id từ slug
    // ---------------------------
    let brandId = null;
    if (brand) {
      const [brandRows] = await db
        .promise()
        .query("SELECT id FROM brands WHERE slug = ?", [brand]);


      if (brandRows.length === 0) {
        return res.status(404).json({ message: "Brand not found" });
      }

      brandId = brandRows[0].id;
    }

    // ---------------------------
    //  Query sản phẩm
    // ---------------------------
    let sql = `
      SELECT p.*, c.name AS category_name, b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE 1
    `;

    let params = [];

    if (categoryId) {
      sql += " AND p.category_id = ? ";
      params.push(categoryId);
    }

    if (brandId) {
      sql += " AND p.brand_id = ? ";
      params.push(brandId);
    }

    if (minPrice) {
      sql += " AND p.price >= ? ";
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      sql += " AND p.price <= ? ";
      params.push(Number(maxPrice));
    }

    // Sắp xếp
    switch (sort) {
      case "price_asc":
        sql += " ORDER BY p.price ASC ";
        break;
      case "price_desc":
        sql += " ORDER BY p.price DESC ";
        break;
      case "newest":
        sql += " ORDER BY p.id DESC ";
        break;
      default:
        sql += " ORDER BY p.id DESC ";
    }

    sql += " LIMIT ? OFFSET ? ";
    params.push(limit, offset);

    const [products] = await db.promise().query(sql, params);

    // ---------------------------
    //  Count total
    // ---------------------------
    let countSql = `SELECT COUNT(*) AS total FROM products WHERE 1 `;
    let countParams = [];

    if (categoryId) {
      countSql += " AND category_id = ? ";
      countParams.push(categoryId);
    }
    if (brandId) {
      countSql += " AND brand_id = ? ";
      countParams.push(brandId);
    }
    if (minPrice) {
      countSql += " AND price >= ? ";
      countParams.push(Number(minPrice));
    }
    if (maxPrice) {
      countSql += " AND price <= ? ";
      countParams.push(Number(maxPrice));
    }

    const [countData] = await db.promise().query(countSql, countParams);

      res.json({
        total: countData[0].total,
        page,
        totalPages: Math.ceil(countData[0].total / limit),
        products,
        selected_category_name: categoryId ? (products[0]?.category_name || null) : null,
        selected_brand_name: brandId ? (products[0]?.brand_name || null) : null,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err });
  }
};
// GET /api/products/:id
export const getProductDetailCus = (req, res) => {
    const productSlug = req.params.slug;
  
    const sql = `
        SELECT 
            p.id AS product_id,
            p.name,
            p.slug,
            p.description,
            p.price,
            p.image,
            p.status,

            v.id AS variant_id,
            v.name_variant,
            v.color,
            v.power,
            v.connection_type,
            v.has_microphone,
            v.price AS variant_price,
            v.stock,
            v.image AS variant_image
        FROM products p
        LEFT JOIN variants v ON p.id = v.product_id
        WHERE p.slug = ?
    `;

    db.query(sql, [productSlug], (err, rows) => {
        if (err) {
            return res.status(500).json({ message: "Lỗi server", err });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
        }

        // Gom dữ liệu thủ công
        const product = {
            id: rows[0].product_id,
            name: rows[0].name,
            slug: rows[0].slug,
            description: rows[0].description,
            price: rows[0].price,
            image: rows[0].image,
            status: rows[0].status,
            variants: []
        };

        rows.forEach(r => {
            if (r.variant_id) {
                product.variants.push({
                    id: r.variant_id,
                    name_variant: r.name_variant,
                    color: r.color,
                    power: r.power,
                    connection_type: r.connection_type,
                    has_microphone: r.has_microphone,
                    price: r.variant_price,
                    stock: r.stock,
                    image: r.variant_image
                });
            }
        });

        res.json(product);
    });
};

export const searchProducts = (req, res) => {
  try {
    const keyword = req.query.search?.trim() || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    if (!keyword) {
      return res.json({
        success: true,
        keyword: "",
        total: 0,
        totalPages: 1,
        currentPage: 1,
        products: [],
        suggestions: []
      });
    }

    const words = keyword.split(/\s+/);
    const whereWords = words.map(() => `p.name LIKE ?`).join(" AND ");
    const whereWordsNoAlias = whereWords.replace(/p\./g, "");
    const paramsWords = words.map((w) => `%${w}%`);

    // ─────────────────────────────
    // 1) SUGGEST QUERY (không alias)
    // ─────────────────────────────
    const suggestQuery = `
      SELECT name 
      FROM products
      WHERE ${whereWordsNoAlias}
      ORDER BY id DESC
      LIMIT 5
    `;

    db.query(suggestQuery, paramsWords, (err, suggestResult) => {
      if (err) {
        console.log("❌ Suggest error:", err);
        return res.status(500).json({ error: "Lỗi suggest" });
      }

      const suggestions = suggestResult.map(i => i.name);

      // ─────────────────────────────
      // 2) COUNT QUERY
      // ─────────────────────────────
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM products p
        LEFT JOIN brands b ON b.id = p.brand_id
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE ${whereWords}
      `;

      db.query(countQuery, paramsWords, (err, countResult) => {
        if (err) {
          console.log("❌ Count error:", err);
          return res.status(500).json({ error: "Lỗi count" });
        }

        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);

        // ─────────────────────────────
        // 3) DATA QUERY
        // ─────────────────────────────
        const dataQuery = `
          SELECT 
            p.id, p.name, p.slug, p.image, p.price,  p.status,
            b.name AS brand_name,
            c.name AS category_name
          FROM products p
          LEFT JOIN brands b ON b.id = p.brand_id
          LEFT JOIN categories c ON c.id = p.category_id
          WHERE ${whereWords}
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?
        `;

        db.query(
          dataQuery,
          [...paramsWords, limit, offset],
          (err, products) => {
            if (err) {
              console.log("❌ Product query error:", err);
              return res.status(500).json({ error: "Lỗi query sản phẩm" });
            }

            res.json({
              success: true,
              keyword,
              currentPage: page,
              totalPages,
              total,
              products,
              suggestions
            });
          }
        );
      });
    });
  } catch (error) {
    console.log("❌ Server error:", error);
    res.status(500).json({ error: "Lỗi server!" });
  }
};
// Lấy sản phẩm hot
export const getHotProducts = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const dataQuery = `
      SELECT 
        p.*,
        b.name AS brand_name,
        c.name AS category_name,
        cp.code AS coupon_code,
        cp.type,
        cp.value
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN coupons cp ON p.coupon_id = cp.id
      ORDER BY p.id DESC
      LIMIT ?
    `;

    db.query(dataQuery, [limit], (err, products) => {
      if (err) return res.status(500).json({ error: err.message });

      if (products.length === 0) return res.json({ data: [] });

      const productIds = products.map(p => p.id);
      const variantsQuery = `SELECT * FROM variants WHERE product_id IN (?)`;
      db.query(variantsQuery, [productIds], (err, variants) => {
        if (err) return res.status(500).json({ error: err.message });

        const productsWithVariants = products.map(p => ({
          ...p,
          variants: variants.filter(v => v.product_id === p.id)
        }));

        res.json({ data: productsWithVariants });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Lấy sản phẩm nổi bật
export const getFeaturedProducts = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const dataQuery = `
      SELECT 
        p.*,
        b.name AS brand_name,
        c.name AS category_name,
        cp.code AS coupon_code,
        cp.type,
        cp.value
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN coupons cp ON p.coupon_id = cp.id
      WHERE p.coupon_id IS NOT NULL
      ORDER BY p.id DESC
      LIMIT ?
    `;

    db.query(dataQuery, [limit], (err, products) => {
      if (err) return res.status(500).json({ error: err.message });

      if (products.length === 0) return res.json({ data: [] });

      const productIds = products.map(p => p.id);
      const variantsQuery = `SELECT * FROM variants WHERE product_id IN (?)`;
      db.query(variantsQuery, [productIds], (err, variants) => {
        if (err) return res.status(500).json({ error: err.message });

        const productsWithVariants = products.map(p => ({
          ...p,
          variants: variants.filter(v => v.product_id === p.id)
        }));

        res.json({ data: productsWithVariants });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
