import db from "../config/db.js";

export let ioInstance = null;
export let onlineUsers = { admin: {}, customer: {} };

export function setupNotificationSocket(io) {
  ioInstance = io;

  io.on("connection", (socket) => {
    console.log(`🟢 Socket connected: ${socket.id}`);

    // Người dùng join socket
    socket.on("joinNotification", ({ userId, isAdmin }) => {
      const type = isAdmin ? "admin" : "customer";
      onlineUsers[type][userId] = socket.id;
      console.log(`Người dùng ${userId} (${type}) online`);
    });

    // Lấy thông báo chưa đọc
    socket.on("getUnreadNotifications", ({ userId }) => {
      const sql = `SELECT * FROM notifications WHERE receiver_id=? AND is_read=0 ORDER BY created_at DESC`;
      db.query(sql, [userId], (err, results) => {
        if (err) return console.error(err);
        socket.emit("unreadNotifications", results);
      });
    });

    // Đánh dấu thông báo đã đọc
    socket.on("markAsRead", ({ notificationId }) => {
      const sql = `UPDATE notifications SET is_read=1 WHERE id=?`;
      db.query(sql, [notificationId], (err) => {
        if (err) console.error(err);
      });
    });

    // Khi admin cập nhật trạng thái đơn hàng
    socket.on("joinOrder", ({ userId }) => {
      // dùng chung onlineUsers.customer[userId] để emit realtime
      console.log(`Khách hàng ${userId} join order socket`);
    });

    socket.on("disconnect", () => {
      for (let type of ["admin", "customer"]) {
        for (let id in onlineUsers[type]) {
          if (onlineUsers[type][id] === socket.id) {
            console.log(`Người dùng ${id} (${type}) disconnect`);
            delete onlineUsers[type][id];
          }
        }
      }
    });
  });
}

// Emit tin nhắn
export function emitMessageNotification(toUserId, fromUserId, message) {
  const sql = `INSERT INTO notifications (type, sender_id, receiver_id, title, content)
               VALUES ('message', ?, ?, 'Tin nhắn mới', ?)`;
  db.query(sql, [fromUserId, toUserId, message], (err, result) => {
    if (err) return console.error(err);

    console.log(`✅ Lưu thông báo tin nhắn ID ${result.insertId}`);

    if (ioInstance) {
      Object.values(onlineUsers.admin).forEach(sid => {
        ioInstance.to(sid).emit("newNotification", {
          id: result.insertId,
          type: "message",
          title: "Tin nhắn mới",
          content: message,
          sender_id: fromUserId,
          receiver_id: toUserId,
          created_at: new Date()
        });
      });

      const custSocket = onlineUsers.customer[toUserId];
      if (custSocket) {
        ioInstance.to(custSocket).emit("newNotification", {
          id: result.insertId,
          type: "message",
          title: "Tin nhắn mới",
          content: message,
          sender_id: fromUserId,
          receiver_id: toUserId,
          created_at: new Date()
        });
      }
    }
  });
}

// Emit order đơn hàng mới cho admin
export function emitOrderNotification(orderId, customerId) {
  const content = `Khách hàng #${customerId} vừa đặt đơn hàng #${orderId}`;
  const sql = `INSERT INTO notifications (type, sender_id, receiver_id, title, content)
               VALUES ('order', ?, NULL, 'Đơn hàng mới', ?)`;
  db.query(sql, [customerId, content], (err, result) => {
    if (err) return console.error(err);

    console.log(`✅ Lưu thông báo đơn hàng ID ${result.insertId}`);

    if (ioInstance) {
      Object.values(onlineUsers.admin).forEach(sid => {
        ioInstance.to(sid).emit("newNotification", {
          id: result.insertId,
          type: "order",
          title: "Đơn hàng mới",
          content,
          sender_id: customerId,
          created_at: new Date()
        });
      });
    }
  });
}

// Emit cập nhật trạng thái đơn hàng cho khách
export function emitOrderStatusUpdate(orderId, customerId, order_status) {
  if (!ioInstance) return;
  const custSocket = onlineUsers.customer[customerId];
  if (!custSocket) {
    console.log(`ℹ️ Khách hàng ${customerId} không online, bỏ qua emit`);
    return;
  }

  ioInstance.to(custSocket).emit("orderStatusUpdated", { orderId, order_status });
  console.log(`📦 Cập nhật trạng thái đơn hàng ${orderId} => ${order_status} gửi khách hàng ${customerId}`);
}
