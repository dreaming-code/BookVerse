const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  id: String,
  senderId: String,

  content: {
    type: String,
    default: ""
  },

  type: {
    type: String,
    enum: ["text", "image", "file", "system"],
    default: "text"
  },

  fileName: String,
  fileSize: Number,
  fileType: String,
  fileData: String,

  timestamp: Number
});

const ChatSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },

  type: {
    type: String,
    enum: ["direct", "group"],
    required: true
  },

  name: String,
  avatar: String,

  members: [String],

  admins: [String],

  messages: [MessageSchema],

  createdBy: String,

  createdAt: Number,

  // PUBLIC / PRIVATE GROUP
  isPublic: {
    type: Boolean,
    default: false
  },

  invitedMembers: [String]
});

module.exports = mongoose.model("Chat", ChatSchema);