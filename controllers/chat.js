const User    = require("../models/user");
const Message = require("../models/message");
const mongoose = require("mongoose");
const { emitNewMessage } = require("../socket");

const getFileUrl = (req, filename) => (
  `${req.protocol}://${req.get("host")}/uploads/${filename}`
);

const getLastMessageText = (message = {}) => {
  if (message.text) return message.text;
  const attachment = message.attachments?.[0];
  if (attachment?.kind === "image") return "Image";
  if (attachment?.kind === "file") return "File";
  return "";
};

const formatMessage = (message, myId) => ({
  id:          message._id,
  text:        message.text,
  attachments: message.attachments || [],
  isRead:      message.isRead,
  createdAt:   message.createdAt,
  sender: {
    id:           message.sender._id,
    name:         message.sender.name,
    email:        message.sender.email,
    profileImage: message.sender.profileImage,
  },
  isMine: message.sender._id.toString() === myId.toString(),
});

// ── 1. Find user by email ─────────────────────────────────
// GET /api/chat/find-user?email=aparna@gmail.com
const findUserByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
console.log("inside 1");

    const user = await User.findOne({
      email,
      _id:      { $ne: req.user._id }, // exclude self
      isActive: true,
    }).select("name email profileImage");
console.log(user);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found with this email",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id:           user._id,
        name:         user.name,
        email:        user.email,
        profileImage: user.profileImage,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      error:   error.message,
    });
  }
};

// ── 2. Get all conversations (grouped) ───────────────────
// GET /api/chat/conversations
const getConversations = async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user._id);

    // group messages by the other participant
    const conversations = await Message.aggregate([
      // find all messages where I am involved
      { $match: { participants: myId } },

      // sort newest first
      { $sort: { createdAt: -1 } },

      // group by the other user
      {
        $group: {
          _id:             "$participants",
          lastMessage:     { $first: "$text" },
          lastAttachments: { $first: "$attachments" },
          lastMessageTime: { $first: "$createdAt" },
          unread: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq:  ["$isRead",   false] },
                    { $ne:  ["$sender",   myId]  },
                  ],
                },
                1, 0,
              ],
            },
          },
        },
      },

      // sort by latest message
      { $sort: { lastMessageTime: -1 } },
    ]);

    // get the other user's info for each conversation
    const shaped = await Promise.all(
      conversations.map(async (conv) => {
        const otherId = conv._id.find(
          (id) => id.toString() !== myId.toString()
        );
        const other = await User.findById(otherId)
          .select("name email profileImage");

        return {
          id:              otherId,         // use userId as conversationId
          name:            other?.name,
          email:           other?.email,
          profileImage:    other?.profileImage,
          lastMessage:     getLastMessageText({
            text: conv.lastMessage,
            attachments: conv.lastAttachments,
          }),
          lastMessageTime: conv.lastMessageTime,
          unread:          conv.unread,
          isOnline:        false,           // socket.io handles this
        };
      })
    );

    res.status(200).json({
      success:       true,
      conversations: shaped,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      error:   error.message,
    });
  }
};

// ── 3. Start chat — just find user, no model needed ──────
// POST /api/chat/start
// body: { email }
const startChat = async (req, res) => {
  try {
    const { email } = req.body;
    const myId      = req.user._id;

    const otherUser = await User.findOne({
      email,
      isActive: true,
    }).select("name email profileImage");

    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (otherUser._id.toString() === myId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot chat with yourself",
      });
    }

    // no model needed — just return the user info
    // conversation is identified by the two user IDs
    res.status(200).json({
      success: true,
      data: {
        id:           otherUser._id, // use userId as conversationId
        name:         otherUser.name,
        email:        otherUser.email,
        profileImage: otherUser.profileImage,
        lastMessage:  "",
        unread:       0,
        isOnline:     false,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      error:   error.message,
    });
  }
};

// ── 4. Get messages between me and another user ───────────
// GET /api/chat/:userId/messages
const getMessages = async (req, res) => {
  try {
    const myId      = req.user._id;
    const { userId } = req.params;

    const messages = await Message.find({
      participants: { $all: [myId, userId] },
    })
      .populate("sender",   "name email profileImage")
      .populate("receiver", "name email profileImage")
      .sort({ createdAt: 1 }); // oldest first

    // mark received messages as read
    await Message.updateMany(
      {
        participants: { $all: [myId, userId] },
        sender:       userId,
        isRead:       false,
      },
      { isRead: true }
    );

    res.status(200).json({
      success:  true,
      messages: messages.map((m) => formatMessage(m, myId)),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      error:   error.message,
    });
  }
};

// ── 5. Send message ───────────────────────────────────────
// POST /api/chat/:userId/message
// body: { text }
const sendMessage = async (req, res) => {
  try {
    const myId       = req.user._id;
    const { userId } = req.params;
const { text = "" } = req.body || {};
    const attachments = [];

    if (req.files?.image?.[0]) {
      const file = req.files.image[0];
      attachments.push({
        kind:     "image",
        url:      getFileUrl(req, file.filename),
        filename: file.originalname,
        mimetype: file.mimetype,
        size:     file.size,
      });
    }

    if (req.files?.files?.[0]) {
      const file = req.files.files[0];
      attachments.push({
        kind:     "file",
        url:      getFileUrl(req, file.filename),
        filename: file.originalname,
        mimetype: file.mimetype,
        size:     file.size,
      });
    }

    if (!text?.trim() && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message text or attachment is required",
      });
    }

    // check receiver exists
    const receiver = await User.findById(userId).select("name email profileImage");
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    // save message — no conversation model needed
    const message = await Message.create({
      participants: [myId, userId], // both users
      sender:       myId,
      receiver:     userId,
      text:         text.trim(),
      attachments,
    });

    await message.populate("sender", "name email profileImage");

    const responseMessage = formatMessage(message, myId);

    emitNewMessage({
      senderId:   myId,
      receiverId: userId,
      message:    { ...responseMessage, isMine: false },
    });

    res.status(201).json({
      success: true,
      message: responseMessage,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
      error:   error.message,
    });
  }
};

module.exports = {
  findUserByEmail,
  getConversations,
  startChat,
  getMessages,
  sendMessage,
};
