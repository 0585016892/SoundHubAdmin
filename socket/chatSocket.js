import db from "../config/db.js";
import { emitMessageNotification } from "./notificationSocket.js";

let onlineUsers = { customer: {}, admin: {} };

export function setupChatSocket(io) {
  console.log("🔥 setupChatSocket INIT");

  io.on("connection", (socket) => {
    console.log(`🟢 Client kết nối: ${socket.id}`);

    // 🚫 Chống gắn listener trùng
    socket.removeAllListeners("sendMessage");

    // Join
    socket.on("join", ({ userId, isAdmin }) => {
      const type = isAdmin ? "admin" : "customer";
      onlineUsers[type][userId] = socket.id;
      console.log(`👤 ${type} ${userId} online`);
      emitOnlineUsers(io);
    });

    // Gửi tin nhắn
    socket.on("sendMessage", async ({ toUserId, fromUserId, message, isAdminSender }) => {
      const senderType = isAdminSender ? "admin" : "customer";
      let receiverId = toUserId;

      // Customer → Admin
      if (!isAdminSender) {
        const [admins] = await db
          .promise()
          .query("SELECT id FROM employees WHERE role='admin' LIMIT 1");

        if (!admins.length) return;
        receiverId = admins[0].id;
      }

      // Lưu DB
      const sql = `
        INSERT INTO messages (sender_type, sender_id, receiver_id, message)
        VALUES (?, ?, ?, ?)
      `;

      db.query(sql, [senderType, fromUserId, receiverId, message], (err, result) => {
        if (err) return console.error(err);

        console.log(`💬 ${senderType} ${fromUserId} → ${receiverId}: "${message}"`);

        // Emit realtime
        if (isAdminSender) {
          const custSocket = onlineUsers.customer[receiverId];
          if (custSocket) {
            io.to(custSocket).emit("receiveMessage", {
              fromUserId,
              message,
              isAdminSender,
            });
          }
        } else {
          Object.values(onlineUsers.admin).forEach((sid) => {
            io.to(sid).emit("receiveMessage", {
              fromUserId,
              message,
              isAdminSender,
            });
          });
        }

        // 🔔 Notification (CHỈ 1 LẦN)
        emitMessageNotification(receiverId, fromUserId, message);
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      for (let type of ["customer", "admin"]) {
        for (let id in onlineUsers[type]) {
          if (onlineUsers[type][id] === socket.id) {
            delete onlineUsers[type][id];
            console.log(`🔴 ${type} ${id} offline`);
          }
        }
      }
      emitOnlineUsers(io);
    });
  });
}

function emitOnlineUsers(io) {
  db.query("SELECT id, full_name FROM customers", (err, results) => {
    if (err) return;

    const isAdminOnline = Object.keys(onlineUsers.admin).length > 0;

    Object.values(onlineUsers.admin).forEach((sid) => {
      io.to(sid).emit("updateOnlineUsers", results);
    });

    results.forEach((c) => {
      const socketId = onlineUsers.customer[c.id];
      if (socketId) {
        io.to(socketId).emit("updateAdminStatus", isAdminOnline);
      }
    });
  });
}
