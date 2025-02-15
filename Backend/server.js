import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import http from "http";

const app = express();

app.use(
  cors({
    origin: ["https://guffandgaff.netlify.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://guffandgaff.netlify.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});

server.listen(4000, () => {
  console.log("Server running on port 4000");
});

let queue = []; // Users waiting to be paired
let users = []; // All connected users
let rooms = []; // Active rooms

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  users.push(socket);

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    cleanupUser(socket.id);
  });

  // Handle user starting the chat
  socket.on("start", () => {
    if (queue.includes(socket.id)) {
      console.log("User is already in the queue:", socket.id);
      return;
    }

    queue.push(socket.id);
    console.log("Queue:", queue);

    if (queue.length >= 2) {
      const id1 = queue.shift();
      const id2 = queue.shift();

      const user1 = users.find((x) => x.id === id1);
      const user2 = users.find((x) => x.id === id2);

      if (!user1 || !user2) {
        console.error("One or both users not found:", id1, id2);
        return;
      }

      const ROOM_ID = `${id1}-${id2}`;
      rooms.push({ ROOM_ID, user1, user2 });

      user1.join(ROOM_ID);
      user2.join(ROOM_ID);

      user1.emit("createOffer", { ROOM_ID, user2: user2.id });
      user1.emit("NewUser");
    }
  });

  // Handle WebRTC offer
  socket.on("offer", ({ user2, offer }) => {
    const toSend = users.find((x) => x.id === user2);
    toSend?.emit("offer", { offer, From: socket.id });
  });

  // Handle WebRTC answer
  socket.on("answer", ({ answer, To }) => {
    const toSend = users.find((x) => x.id === To);
    toSend?.emit("answer", { answer });
  });

  // Handle WebRTC negotiation needed
  socket.on("negoNeeded", ({ offer, user2 }) => {
    const toSend = users.find((x) => x.id === user2);
    toSend?.emit("negoNeeded", { offer, From: socket.id });
  });

  // Handle WebRTC negotiation done
  socket.on("negoDone", ({ answer, To }) => {
    const toSend = users.find((x) => x.id === To);
    toSend?.emit("negoFinal", { answer });
  });

  // Handle new chat message
  socket.on("newMessage", ({ sendingMessage, remoteUser }) => {
    const toSend = users.find((x) => x.id === remoteUser);
    toSend?.emit("newMessage", { sendingMessage, remoteUser });
  });

  // Handle ICE candidate
  socket.on("addIceCandidate", ({ candidate, remoteUser }) => {
    const toSend = users.find((x) => x.id === remoteUser);
    toSend?.emit("addIceCandidate", { candidate });
  });

  // Handle ending the call
  socket.on("end", ({ remoteUser }) => {
    const room = rooms.find(
      (x) => x.user1.id === remoteUser || x.user2.id === remoteUser
    );

    if (room) {
      const otherUser = room.user1.id === socket.id ? room.user2 : room.user1;
      otherUser?.emit("end");

      // Clean up the room
      rooms = rooms.filter((x) => x.ROOM_ID !== room.ROOM_ID);
      socket.leave(room.ROOM_ID);
      otherUser?.leave(room.ROOM_ID);

      // Re-add the other user to the queue
      queue.push(otherUser.id);
    }
  });
});

// Clean up user data on disconnect
function cleanupUser(userId) {
  // Remove user from the queue
  queue = queue.filter((x) => x !== userId);

  // Remove user from the users array
  users = users.filter((x) => x.id !== userId);

  // Find and clean up the room the user was in
  const room = rooms.find(
    (x) => x.user1.id === userId || x.user2.id === userId
  );

  if (room) {
    const otherUser = room.user1.id === userId ? room.user2 : room.user1;
    otherUser?.emit("disconnected");

    // Clean up the room
    rooms = rooms.filter((x) => x.ROOM_ID !== room.ROOM_ID);
    otherUser?.leave(room.ROOM_ID);

    // Re-add the other user to the queue
    queue.push(otherUser.id);
  }
}