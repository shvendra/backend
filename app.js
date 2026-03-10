import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import mongoSanitize from "mongo-sanitize";
import hpp from "hpp";

// Routes
import dbConnection from "./database/dbConnection.js";
import jobRouter from "./routes/jobRoutes.js";
import userRouter from "./routes/userRoutes.js";
import applicationRouter from "./routes/applicationRoutes.js";
import chatRouter from "./routes/chatRoutes.js";
import otpRoute from "./routes/otpRoute.js";
import adminRouter from "./routes/adminRoute.js";
import attendanceRoute from "./routes/attendanceRoute.js";
import paymentRoute from "./routes/paymentRoute.js";
import emailRoutes from "./routes/email.js";
import userStats from "./routes/userStats.js";
import userCommentsRouter from "./routes/userComments.js";
import blogRouter from "./routes/blogRoutes.js"; // ✅ NEW
import blogCommentRoutes from "./routes/blogCommentRoutes.js";
import monitoringRouter from "./routes/monitoring.js"; // ✅ PRODUCTION MONITORING

import sessionRoute from "./routes/sessionRoute.js";

// Middlewares
import { errorMiddleware } from "./middlewares/error.js";
import { cache } from "./middlewares/cache.js"; // ✅ REDIS CACHING

// Models
import Chat from "./models/chatSchema.js";

// Socket middlewares
import { socketAuth, socketRateLimit } from "./middlewares/socketAuth.js";
import dotenv from "dotenv";
dotenv.config();
// __dirname workaround for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize App
const app = express();
config(); // Use default .env file
const allowedOrigins = [
  "https://bookmyworkers.com", 
  "https://www.bookmyworkers.com"
];

// Add localhost for development
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  );
}
// =========================
// EXPRESS CORS (API ONLY)
// =========================
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-session-token",
    ],
  })
);

// Handle preflight cleanly
app.options("*", cors());


// Create HTTP server & Socket.IO server
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  path: "/app/socket.io", // <--- Match the frontend path
  cors: {
    origin: process.env.NODE_ENV === "production"
      ? ["https://bookmyworkers.com", "https://www.bookmyworkers.com"]
      : ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  },
  transports: ["polling", "websocket"], // ✅ IMPORTANT
});


app.set("io", io);

// CORS Middleware - Secure configuration

// Security Middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          ...allowedOrigins, // ✅ allow frontend domains to make API calls
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);


// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});

// Compression
app.use(compression());



app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,PATCH,OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, x-session-token"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});


// Core Middleware
app.use(cookieParser());

// Body parsing with limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Data sanitization middleware
app.use((req, res, next) => {
  if (req.body) req.body = mongoSanitize(req.body);
  if (req.query) req.query = mongoSanitize(req.query);
  if (req.params) req.params = mongoSanitize(req.params);
  next();
});
app.use(hpp()); // Prevent HTTP Parameter Pollution

// File Upload Middleware with security limits
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  abortOnLimit: true,
  responseOnLimit: "File size limit exceeded (50MB max)",
  createParentPath: true,
  useTempFiles: false,
  tempFileDir: '/tmp/',
  safeFileNames: true,
  preserveExtension: 4,
}));


app.set("trust proxy", 1);

app.set("trust proxy", 1);

app.use(
  session({
    name: "connect.sid",
    secret: process.env.JWT_SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.DB_URL,
      dbName: process.env.DATABASE,
      touchAfter: 24 * 3600,
    }),
    cookie: {
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/",
    },
  })
);

// app.use((req, res, next) => {
//   console.log("🍪 Incoming cookies:", req.headers.cookie);
//   console.log("📦 Session ID:", req.sessionID);
//   console.log("📦 Session object:", req.session);
//   next();
// });
// Static File Serving for KYC and Profile Photos
// app.use("/kyc_doc", express.static(path.join(__dirname, "kyc_doc")));
// app.use("/profile_photo", express.static(path.join(__dirname, "profile_photo")));
app.use("/kyc_doc", express.static(path.join("/var/www/uploads/kyc_doc")));
app.use("/profile_photo", express.static(path.join("/var/www/uploads/profile_photo")));
app.use("/blog_photos", express.static(path.join("/var/www/uploads/blog_photos")));
// app.use("/blog_photos", express.static(path.join("/var/www/uploads/blog_photos")));
// app.use("/blog_photos", express.static(path.join(__dirname, "blog_photos")));

// ✅ PRODUCTION-OPTIMIZED ROUTES WITH CACHING
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/user", cache(300), userRouter); // Cache user data for 5min
app.use("/api/v1/users", adminRouter); // Admin routes - no cache
app.use("/api/v1/job", cache(600), jobRouter); // Cache jobs for 10min
app.use("/api/v1/application", applicationRouter); // No cache for applications
app.use("/api/v1/chat", chatRouter); // No cache for real-time chat
app.use("/api/v1/otp", otpRoute); // No cache for OTP
app.use("/api/v1/attendance", attendanceRoute); // No cache for attendance
app.use("/api/v1/payment", paymentRoute); // No cache for payments
app.use('/api/email', emailRoutes); // No cache for emails
app.use('/api/view', cache(1800), userStats); // Cache stats for 30min
app.use("/api/user-comments", userCommentsRouter); // No cache for comments
app.use("/api/v1/blogs", cache(600), blogRouter); // ✅ CACHED BLOG ROUTE (10min)
app.use("/api/v1/blogs-comment", blogCommentRoutes);

// ✅ PRODUCTION MONITORING ROUTES
app.use("/api/v1/monitoring", monitoringRouter);

app.use("/api/v1/session", sessionRoute);

// ✅ LEGACY HEALTH CHECK (kept for backward compatibility)
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API is healthy",
    timestamp: new Date(),
  });
});

dbConnection();

// Socket.IO with authentication
io.use(socketAuth);

io.on("connection", (socket) => {
  console.log(`User ${socket.user.name} (${socket.userRole}) connected`);

  socket.on("join_room", (roomId) => {
    if (!socketRateLimit(socket, "join_room")) {
      socket.emit("error", "Rate limit exceeded");
      return;
    }
    
    // Validate roomId format
    if (!roomId || typeof roomId !== 'string' || roomId.length > 100) {
      socket.emit("error", "Invalid room ID");
      return;
    }
    
    socket.join(roomId);
    console.log(`User ${socket.userId} joined room ${roomId}`);
  });

  socket.on("send_message", async (data) => {
    if (!socketRateLimit(socket, "send_message")) {
      socket.emit("error", "Rate limit exceeded");
      return;
    }

    const { room, message } = data;

    // Validate input
    if (!room || !message || typeof message !== 'string') {
      socket.emit("error", "Invalid message data");
      return;
    }

    if (message.length > 1000) {
      socket.emit("error", "Message too long (max 1000 characters)");
      return;
    }

    try {
      let chat = await Chat.findOne({ roomId: room });
      if (!chat) {
        chat = new Chat({ roomId: room, messages: [] });
      }

      const msgObj = {
        sender: socket.userId,
        role: socket.userRole,
        message: message.trim(),
        timestamp: new Date(),
        roomId: room,
        readBy: [socket.userId], // Mark as read for sender
      };

      chat.messages.push(msgObj);
      await chat.save();

      // Emit to room (for real-time message updates)
      io.to(room).emit("receive_message", {
        sender: socket.userId,
        role: socket.userRole,
        message: msgObj.message,
        timestamp: msgObj.timestamp,
        roomId: room,
      });

      // Emit globally for unread update
      io.sockets.emit("new_message", {
        sender: socket.userId,
        postId: room,
      });

    } catch (error) {
      console.error("Error saving message:", error);
      socket.emit("error", "Failed to send message");
    }
  });

  socket.on("mark_messages_read", async ({ roomId }) => {
    if (!socketRateLimit(socket, "mark_messages_read")) {
      socket.emit("error", "Rate limit exceeded");
      return;
    }

    try {
      const chat = await Chat.findOne({ roomId });
      if (!chat) return;

      let updated = false;

      chat.messages.forEach((msg) => {
        if (!msg.readBy.includes(socket.userId)) {
          msg.readBy.push(socket.userId);
          updated = true;
        }
      });

      if (updated) await chat.save();
    } catch (err) {
      console.error("Error marking messages as read:", err);
      socket.emit("error", "Failed to mark messages as read");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.userId} disconnected`);
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error);
  });
});


// Static file serving
// app.use(express.static(path.join(__dirname, 'dist')));

app.use(
  "/",
  express.static(path.join(__dirname, "dist"))
);

/* CRM at /app */
app.use(
  "/app",
  express.static(path.join(__dirname, "dist-crm"))
);

/* React fallback for CRM */
app.get("/app/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist-crm", "index.html"));
});

/* React fallback for website */
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist-web", "index.html"));
});
// SPA fallback route (should be last)
app.get('*', (req, res) => {
  // Avoid intercepting API or socket routes
  if (
    req.originalUrl.startsWith('/api/') ||
    req.originalUrl.startsWith('/socket.io/')
  ) {
    return res.status(404).json({ message: 'Not Found' });
  }

  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// Error middleware (must be last)
app.use(errorMiddleware);
export default server;
