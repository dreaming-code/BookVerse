const mongoose = require("mongoose");

const PendingBookSchema = new mongoose.Schema(
  {
    title: String,
    author: String,
    description: String,
    genre: [String],
    coverUrl: String,
    fileUrl: String,

    status: {
      type: String,
      default: "PENDING"
    },

    submittedBy: {
      name: String,
      email: String
    }
  },
  {
    timestamps: true
  }
);
module.exports = mongoose.model("PendingBook", PendingBookSchema);