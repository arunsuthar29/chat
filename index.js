const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

/* -------------------------------
   Serve Frontend HTML
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

  socket.on("join-room", (roomId) => {

    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        messages: [],
        createdAt: Date.now()
      };

      // delete room after 24 hours
      setTimeout(() => {
        delete rooms[roomId];
        console.log("Room deleted:", roomId);
      }, 24 * 60 * 60 * 1000);
    }

    socket.emit("load-messages", rooms[roomId].messages);

  });

  socket.on("send-message", ({ roomId, message }) => {

  if (!rooms[roomId]) return;

  const msg = {
    text: message,
    sender: socket.id,
    time: new Date()
  };

  rooms[roomId].messages.push(msg);

  io.to(roomId).emit("receive-message", msg);

});


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

/* -------------------------------
   Start Server
--------------------------------*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});

