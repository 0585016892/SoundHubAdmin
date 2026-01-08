import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { Server } from "socket.io";

import { setupChatSocket } from "./socket/chatSocket.js"; // socket chat riêng
import { setupNotificationSocket } from './socket/notificationSocket.js';

// Routes
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import variantRoutes from "./routes/variantRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import couponRoutes from "./routes/couponRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import statisticsRouter from "./routes/statisticsApi.js";
import authRoutes from "./routes/authRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import dashboardApi from "./routes/dashboardApi.js";
import colorRoutes from "./routes/colorRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import contact from "./routes/contactRoutes.js";



import { setupSwagger } from "./swagger.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Swagger
setupSwagger(app);

// Routes
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/variant", variantRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/statistics", statisticsRouter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", protectedRoutes);
app.use("/api/dashboard", dashboardApi);
app.use("/api/colors", colorRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/contact", contact);
// --- Socket.IO setup ---
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST","PUT","DELETE"] },
});

// Gắn socket chat riêng
setupChatSocket(io);
setupNotificationSocket(io);

// Nếu cần, có thể gắn thêm các socket khác
// setupSocket(io);

// Chạy server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server chạy tại http://localhost:${PORT}`));
