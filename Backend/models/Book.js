const mongoose = require("mongoose");

const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: false },
  description: { type: String, default: "" },
  genre: { type: [String], default: ["General"] },
  featured: { type: Boolean, default: false },
  coverUrl: String, // image URL for frontend
  fileUrl: String,  // PDF/ebook link
  releaseDate: { type: Date, default: Date.now },
  submittedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: false 
  },
  submittedByEmail: String,
  submittedByName: String
}, { timestamps: true });

// Common query paths in routes/books.js
BookSchema.index({ featured: 1, releaseDate: -1 });
BookSchema.index({ genre: 1, releaseDate: -1 });

module.exports = mongoose.model("Book", BookSchema);
