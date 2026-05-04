const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // who are in this chat — always 2 users
    participants: [
      {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      "User",
        required: true,
      },
    ],
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    receiver: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    text: {
      type:     String,
      trim:     true,
      default:  "",
    },
    attachments: [
      {
        kind: {
          type: String,
          enum: ["image", "file"],
        },
        url:      String,
        filename: String,
        mimetype: String,
        size:     Number,
      },
    ],
    isRead: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// index for fast queries
messageSchema.index({ participants: 1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
