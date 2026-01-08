// backend/routes/contact.js
import express from "express";
import { sendEmail } from "../utils/sendEmail.js"; // đường dẫn tới file trên
const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
  }

  try {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="background-color: #007bff; color: #fff; padding: 20px; text-align: center;">
            <h2 style="margin:0;">📩 Thông tin liên hệ mới</h2>
            </div>
            <div style="padding: 20px;">
            <p><strong>Họ và tên:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Số điện thoại:</strong> ${phone || "Không có"}</p>
            <p><strong>Nội dung:</strong><br/>${message.replace(/\n/g, "<br/>")}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 0.9em; color: #555;">Đây là email tự động từ website <strong>Loa SoundHub</strong>. Vui lòng không trả lời email này.</p>
            </div>
        </div>
        `;


    // Gửi email tới shop
    await sendEmail(process.env.EMAIL_USER, `Liên hệ từ ${name}`, htmlContent);

    res.json({ success: true, message: "Gửi liên hệ thành công" });
  } catch (error) {
    console.error("❌ Lỗi gửi email liên hệ:", error);
    res.status(500).json({ success: false, message: "Không thể gửi liên hệ" });
  }
});

export default router;
