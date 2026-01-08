import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Auth Header:", authHeader); // 🔹 xem frontend gửi gì

  if (!authHeader)
    return res.status(401).json({ message: "Token không hợp lệ" });

  const token = authHeader.split(" ")[1];
  console.log("Token Extracted:", token); // 🔹 token thực tế

  if (!token) return res.status(401).json({ message: "Token không hợp lệ" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded); // 🔹 thông tin user trong token
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT Error:", err.message); // 🔹 lỗi verify token
    return res.status(401).json({ message: "Token không hợp lệ" });
  }
};
