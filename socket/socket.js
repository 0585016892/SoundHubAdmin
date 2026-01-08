import { Server } from "socket.io";
import db from "../config/db.js"; // MySQL connection

let ioInstance = null;
let onlineUsers = {}; // { userId: { socketId, isAdmin } }

export default function setupSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET","POST","PUT","DELETE"] },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Client connected:", socket.id);

    socket.on("join", ({ userId, isAdmin }) => {
      onlineUsers[userId] = { socketId: socket.id, isAdmin };
      console.log("Online Users:", onlineUsers);

      // Emit danh sách user online cho admin
      emitOnlineUsers();
    });

    socket.on("sendMessage", ({ toUserId, fromUserId, message, isAdminSender }) => {
      // Lưu tin nhắn vào DB
      db.query(
        "INSERT INTO messages (from_user_id, to_user_id, message, is_admin_sender) VALUES (?, ?, ?, ?)",
        [fromUserId, toUserId, message, isAdminSender],
        (err) => { if (err) console.error(err); }
      );

      // Gửi tin nhắn realtime
      const target = onlineUsers[toUserId];
      if (target) {
        io.to(target.socketId).emit("receiveMessage", { fromUserId, message, isAdminSender });
      }
    });

    socket.on("disconnect", () => {
      for (let id in onlineUsers) {
        if (onlineUsers[id].socketId === socket.id) delete onlineUsers[id];
      }
      emitOnlineUsers();
      console.log("🔴 Client disconnected:", socket.id);
    });
  });

  ioInstance = io;
  return io;
}

function emitOnlineUsers() {
  const admins = Object.values(onlineUsers)
    .filter(u => u.isAdmin)
    .map(a => a.socketId);
  const customers = Object.entries(onlineUsers)
    .filter(([_, u]) => !u.isAdmin)
    .map(([id, _]) => id);

  admins.forEach(sid => {
    ioInstance.to(sid).emit("updateOnlineUsers", customers);
  });
}
