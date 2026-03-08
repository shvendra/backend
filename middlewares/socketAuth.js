import jwt from "jsonwebtoken";
import { User } from "../models/userSchema.js";

// Socket.IO authentication middleware
export const socketAuth = async (socket, next) => {
  try {
    // Get token from cookies or handshake auth
    const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.match(/token=([^;]+)/)?.[1];
    
    if (!token) {
      return next(new Error("No authentication token provided"));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    
    // Get user from database
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return next(new Error("User not found"));
    }

    if (user.status === "Block") {
      return next(new Error("Account is blocked"));
    }

    // Add user info to socket
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.user = user;
    
    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication failed"));
  }
};

// Rate limiting for Socket.IO events
const eventCounts = new Map();
const EVENT_LIMIT = 100; // Max events per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export const socketRateLimit = (socket, eventName) => {
  const key = `${socket.userId}_${eventName}`;
  const now = Date.now();
  
  if (!eventCounts.has(key)) {
    eventCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }
  
  const record = eventCounts.get(key);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
    return true;
  }
  
  if (record.count >= EVENT_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
};
