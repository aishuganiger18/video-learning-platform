require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://video-conference-phi.vercel.app",
    ],
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://video-conference-phi.vercel.app"
    ],
    methods: ["GET", "POST"]
  }
});

// Test route
app.get("/", (req, res) => {
  res.send("Video Conference Server is Running!");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    console.log(`${socket.id} joined room: ${roomId}`);

    socket.to(roomId).emit("user-joined", socket.id);
  });

  // WebRTC offer
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });

  // WebRTC answer
  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  // ICE candidate
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // User leaves room
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId);

    console.log(`${socket.id} left room: ${roomId}`);

    socket.to(roomId).emit("user-left", socket.id);
  });

  // Browser/tab closed
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Port
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});