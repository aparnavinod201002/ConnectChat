const { Server } = require("socket.io");

let io;
const onlineUsers = new Map();

const addOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId) || new Set();
  userSockets.add(socketId);
  onlineUsers.set(userId, userSockets);
};

const removeOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId);
  if (!userSockets) return false;

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  return false;
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      if (!userId) return;

      const normalizedUserId = userId.toString();
      socket.userId = normalizedUserId;
      socket.join(normalizedUserId);

      const wasOffline = !onlineUsers.has(normalizedUserId);
      addOnlineUser(normalizedUserId, socket.id);

      if (wasOffline) {
        io.emit("userOnline", { userId: normalizedUserId });
      }
    });

    socket.on("disconnect", () => {
      if (!socket.userId) return;

      const isNowOffline = removeOnlineUser(socket.userId, socket.id);
      if (isNowOffline) {
        io.emit("userOffline", { userId: socket.userId });
      }
    });
  });

  return io;
};

const emitNewMessage = ({ conversationId, senderId, receiverId, message }) => {
  if (!io || !receiverId) return;

  const targetConversationId = conversationId || senderId;
  if (!targetConversationId) return;

  io.to(receiverId.toString()).emit("newMessage", {
    conversationId: targetConversationId.toString(),
    message,
  });
};

module.exports = {
  initSocket,
  emitNewMessage,
};
