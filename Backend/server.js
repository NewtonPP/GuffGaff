import path from "path";
import http from "http";
import { fileURLToPath } from "url";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Highest priority first — dotenv never overwrites an already-set variable, so
// the host's own env (Render) wins, then personal overrides, then the
// committed per-environment defaults.
const NODE_ENV = process.env.NODE_ENV || "development";

for (const file of [".env.local", `.env.${NODE_ENV}`, ".env"]) {
  dotenv.config({ path: path.join(__dirname, file), quiet: true });
}

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (CLIENT_ORIGINS.length === 0) {
  console.warn(
    `No CLIENT_ORIGINS set for NODE_ENV=${NODE_ENV}; browser clients will be blocked by CORS.`
  );
}

const MAX_MESSAGE_LENGTH = 2000;

const app = express();
const corsOptions = { origin: CLIENT_ORIGINS, methods: ["GET", "POST"] };

app.use(cors(corsOptions));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    env: NODE_ENV,
    connected: users.size,
    waiting: queue.length,
    rooms: rooms.size,
  });
});

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// ---------------------------------------------------------------------------
// Matchmaking state
// ---------------------------------------------------------------------------

let queue = []; // socket ids waiting for a partner, oldest first
const users = new Map(); // socket id -> socket
const rooms = new Map(); // room id -> { roomId, a, b }
const roomByUser = new Map(); // socket id -> room id

function partnerIdOf(userId) {
  const roomId = roomByUser.get(userId);
  if (!roomId) return null;

  const room = rooms.get(roomId);
  if (!room) return null;

  return room.a === userId ? room.b : room.a;
}

function partnerSocketOf(userId) {
  const partnerId = partnerIdOf(userId);
  return partnerId ? users.get(partnerId) ?? null : null;
}

function pair(socketA, socketB) {
  const roomId = `${socketA.id}#${socketB.id}`;

  rooms.set(roomId, { roomId, a: socketA.id, b: socketB.id });
  roomByUser.set(socketA.id, roomId);
  roomByUser.set(socketB.id, roomId);

  socketA.join(roomId);
  socketB.join(roomId);

  // Exactly one side drives the initial offer; the other is the "polite" peer
  // that yields if both ends try to negotiate at once.
  socketA.emit("matched", { roomId, partnerId: socketB.id, initiator: true });
  socketB.emit("matched", { roomId, partnerId: socketA.id, initiator: false });

  console.log(`Paired ${socketA.id} <-> ${socketB.id}`);
}

// Drains the queue as far as it can. Must run after *every* enqueue — that is
// what lets a user orphaned by a disconnect find a partner who is already
// waiting, instead of sitting in the queue until some third user shows up.
function tryPair() {
  while (queue.length >= 2) {
    const socketA = takeNextWaiting();
    if (!socketA) return;

    const socketB = takeNextWaiting();
    if (!socketB) {
      // Nobody left to pair with — put A back at the front so their place in
      // line survives.
      queue.unshift(socketA.id);
      return;
    }

    pair(socketA, socketB);
  }
}

// Pops ids until it finds one backed by a live, unpaired socket.
function takeNextWaiting() {
  while (queue.length > 0) {
    const id = queue.shift();
    const socket = users.get(id);

    if (socket && socket.connected && !roomByUser.has(id)) return socket;
  }
  return null;
}

function enqueue(userId) {
  // Already talking to someone, or already waiting — either way, don't queue
  // a duplicate id that could later be "paired with itself".
  if (roomByUser.has(userId) || queue.includes(userId)) return;

  queue.push(userId);
  tryPair();
}

function dequeue(userId) {
  queue = queue.filter((id) => id !== userId);
}

// Tears down the room `userId` is in and tells the partner they are alone.
// The partner's client decides whether to look for someone new.
function leaveRoom(userId, reason) {
  const roomId = roomByUser.get(userId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  rooms.delete(roomId);
  roomByUser.delete(userId);

  users.get(userId)?.leave(roomId);

  if (!room) return;

  const partnerId = room.a === userId ? room.b : room.a;
  roomByUser.delete(partnerId);

  const partner = users.get(partnerId);
  if (partner) {
    partner.leave(roomId);
    partner.emit("partnerLeft", { reason });
  }
}

// ---------------------------------------------------------------------------
// Socket lifecycle
// ---------------------------------------------------------------------------

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  users.set(socket.id, socket);

  // Look for a partner.
  socket.on("start", () => {
    enqueue(socket.id);

    if (!roomByUser.has(socket.id)) socket.emit("waiting");
  });

  // Hang up on the current partner (or just leave the queue) and go idle.
  socket.on("end", () => {
    dequeue(socket.id);
    leaveRoom(socket.id, "ended");
  });

  // WebRTC signalling. Routed via the room rather than a client-supplied id,
  // so a socket can only ever signal the partner it was actually paired with.
  socket.on("signal", (payload) => {
    const partner = partnerSocketOf(socket.id);
    if (!partner || !payload) return;

    const { description, candidate } = payload;
    if (!description && !candidate) return;

    partner.emit("signal", { from: socket.id, description, candidate });
  });

  socket.on("message", ({ text } = {}) => {
    const partner = partnerSocketOf(socket.id);
    if (!partner || typeof text !== "string") return;

    const trimmed = text.trim();
    if (!trimmed) return;

    partner.emit("message", {
      from: socket.id,
      text: trimmed.slice(0, MAX_MESSAGE_LENGTH),
    });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    dequeue(socket.id);
    leaveRoom(socket.id, "disconnected");
    users.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`GuffGaff server running on port ${PORT} (${NODE_ENV})`);
  console.log(`Allowed origins: ${CLIENT_ORIGINS.join(", ") || "(none)"}`);
});
