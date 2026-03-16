const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

/* -------------------------------
   Socket.io Setup
--------------------------------*/

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

/* -------------------------------
   Serve Frontend
--------------------------------*/

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

/* -------------------------------
   Chat Room Memory Store
--------------------------------*/

const rooms = {};

/* -------------------------------
   Socket Connection
--------------------------------*/

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  /* -------------------------------
     Join Room
  --------------------------------*/

  socket.on("join-room", ({ roomId, password }) => {

    if (!roomId || !password) return;

    // Create room if it doesn't exist
    if (!rooms[roomId]) {

      rooms[roomId] = {
        messages: [],
        password: password,
        users: new Set(),
        createdAt: Date.now()
      };

      console.log("Room created:", roomId);

      // Auto delete after 24 hours
      setTimeout(() => {
        delete rooms[roomId];
        console.log("Room expired:", roomId);
      }, 24 * 60 * 60 * 1000);
    }

    const room = rooms[roomId];

    /* Password verification */

    if (room.password !== password) {
      socket.emit("wrong-password");
      return;
    }

    /* Prevent duplicate joins */

    if (room.users.has(socket.id)) return;

    /* Limit to 2 users */

    if (room.users.size >= 2) {
      socket.emit("room-full");
      return;
    }

    socket.join(roomId);
    room.users.add(socket.id);

    console.log("User joined room:", roomId);

    /* Send previous messages */

    socket.emit("load-messages", room.messages);
  });

  /* -------------------------------
     Send Message
  --------------------------------*/

  socket.on("send-message", ({ roomId, message }) => {

    const room = rooms[roomId];

    if (!room) return;

    /* Only allow authenticated users */

    if (!room.users.has(socket.id)) return;

    const msg = {
      text: message,
      sender: socket.id,
      time: new Date()
    };

    room.messages.push(msg);

    io.to(roomId).emit("receive-message", msg);
  });

  /* -------------------------------
     Handle Disconnect
  --------------------------------*/

  socket.on("disconnect", () => {

    console.log("User disconnected:", socket.id);

    for (const roomId in rooms) {

      const room = rooms[roomId];

      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        console.log("User removed from room:", roomId);
      }

      // Optional: delete empty rooms
      if (room.users.size === 0) {
        delete rooms[roomId];
        console.log("Empty room deleted:", roomId);
      }
    }
  });

});

/* -------------------------------
   Start Server
--------------------------------*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
