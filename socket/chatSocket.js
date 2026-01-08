import db from "../config/db.js"; // MySQL connection
import { emitMessageNotification } from './notificationSocket.js';

let ioInstance = null;
let onlineUsers = { customer: {}, admin: {} }; // phân tách admin & customer

export function setupChatSocket(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`🟢 Client kết nối: ${socket.id}`);

    // Khi client join
    socket.on("join", ({ userId, isAdmin }) => {
      const type = isAdmin ? "admin" : "customer";
      onlineUsers[type][userId] = socket.id;
      console.log(`Người dùng ${userId} (${type}) đã online`);
      emitOnlineUsers();
    });

    // Khi gửi tin nhắn
    socket.on("sendMessage", ({ toUserId, fromUserId, message, isAdminSender }) => {
      const senderType = isAdminSender ? "admin" : "customer";
      const receiverType = isAdminSender ? "customer" : "admin";

      // Lưu tin nhắn vào DB
      const sql = `
        INSERT INTO messages (sender_type, sender_id, receiver_id, message)
        VALUES (?, ?, ?, ?)
      `;
      db.query(sql, [senderType, fromUserId, toUserId, message], (err, result) => {
        if (err) {
          console.error("Lỗi khi lưu tin nhắn:", err);
          return;
        }

        console.log(`Tin nhắn từ ${senderType} ${fromUserId} → ${receiverType} ${toUserId}: "${message}"`);

        // Gửi tin nhắn tới người nhận nếu đang online
        if (receiverType === "admin") {
          Object.values(onlineUsers.admin).forEach(sid => {
            io.to(sid).emit("receiveMessage", { fromUserId, message, isAdminSender });
          });
        } else {
          const targetSocketId = onlineUsers.customer[toUserId];
          if (targetSocketId) {
            io.to(targetSocketId).emit("receiveMessage", { fromUserId, message, isAdminSender });
          }
        }

        // Tạo và gửi thông báo realtime
      });
        emitMessageNotification(toUserId, fromUserId, message);

    });

    // Khi ngắt kết nối
    socket.on("disconnect", () => {
      for (let type of ["customer", "admin"]) {
        for (let id in onlineUsers[type]) {
          if (onlineUsers[type][id] === socket.id) {
            console.log(`Người dùng ${id} (${type}) ngắt kết nối`);
            delete onlineUsers[type][id];
          }
        }
      }
      emitOnlineUsers();
    });
  });
}

// Gửi danh sách khách hàng từ DB cho admin và trạng thái admin cho khách
function emitOnlineUsers() {
  const sql = `SELECT id, full_name, email FROM customers`;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Lỗi khi lấy khách hàng từ DB:", err);
      return;
    }

    const customers = results.map(c => ({ id: c.id, full_name: c.full_name }));
    const admins = Object.values(onlineUsers.admin);

    admins.forEach(sid => {
      ioInstance.to(sid).emit("updateOnlineUsers", customers);
    });

    const isAdminOnline = admins.length > 0;
    results.forEach(c => {
      const customerSocket = onlineUsers.customer[c.id];
      if (customerSocket) {
        ioInstance.to(customerSocket).emit("updateAdminStatus", isAdminOnline);
      }
    });

    console.log("Danh sách khách hàng (DB) gửi cho admin:", customers);
    console.log("Admin online:", isAdminOnline);
  });
}
