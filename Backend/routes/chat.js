const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Chat = require("../models/Chat");

// ======================================================
// GET ALL USERS
// ======================================================
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().lean();

    const formatted = users.map((u) => ({
      id: `user_${u.email.replace(/[^a-zA-Z0-9]/g, "_")}`,
      username: u.email.toLowerCase(),
      password: null,
      displayName: u.name,
      avatar: u.profileImage || null,
      status: u.chat_bio || "Hey there! I am using ChatSphere",
      createdAt: u.createdAt
        ? new Date(u.createdAt).getTime()
        : Date.now()
    }));

    res.json({
      success: true,
      users: formatted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// GET ALL CHATS FOR USER
// ======================================================
router.get("/chats/:userId", async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [
        { members: req.params.userId },
        { isPublic: true }
      ]
    }).lean();

    res.json({
      success: true,
      chats
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// GET SINGLE CHAT
// ======================================================
router.get("/chat/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findOne({
      id: req.params.chatId
    }).lean();

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// CREATE CHAT
// ======================================================
router.post("/chats", async (req, res) => {

  try {

    const chatData = req.body;

    // UPDATE if already exists
    let existingChat = await Chat.findOne({ id: chatData.id });

    if (existingChat) {

      existingChat.type = chatData.type;
      existingChat.name = chatData.name;
      existingChat.avatar = chatData.avatar;
      existingChat.members = chatData.members;
      existingChat.admins = chatData.admins;
      existingChat.messages = chatData.messages;
      existingChat.createdBy = chatData.createdBy;
      existingChat.createdAt = chatData.createdAt;
      existingChat.isPublic = chatData.isPublic;

      await existingChat.save();

      return res.json({
        success: true,
        chat: existingChat
      });
    }

    // CREATE new chat
    const newChat = new Chat(chatData);

    await newChat.save();

    res.json({
      success: true,
      chat: newChat
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
// ======================================================
// SEND MESSAGE
// ======================================================
router.post("/messages/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    const message = req.body;

    const chat = await Chat.findOne({
      id: chatId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    chat.messages.push(message);

    await chat.save();

    res.json({
      success: true,
      message
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// JOIN GROUP
// ======================================================
router.post("/chats/:chatId/join", async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;

    const chat = await Chat.findOne({
      id: chatId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    // PRIVATE GROUP CHECK
    if (
      !chat.isPublic &&
      !chat.invitedMembers.includes(userId)
    ) {
      return res.status(403).json({
        success: false,
        error: "Private group"
      });
    }

    if (!chat.members.includes(userId)) {
      chat.members.push(userId);
      await chat.save();
    }

    res.json({
      success: true,
      chat
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// ======================================================
// ADD MEMBERS
// ======================================================
router.post("/chats/:chatId/add-members", async (req, res) => {
  try {
    const { members } = req.body;

    const chat = await Chat.findOne({
      id: req.params.chatId
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        error: "Chat not found"
      });
    }

    members.forEach((m) => {
      if (!chat.members.includes(m)) {
        chat.members.push(m);
      }
    });

    await chat.save();

    res.json({
      success: true,
      chat
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

module.exports = router;