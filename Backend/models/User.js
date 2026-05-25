const mongoose = require('mongoose');

const ProgressSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  },

  progress: {
    type: Number,
    default: 0
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const UserSchema = new mongoose.Schema({

  // =========================
  // BASIC INFO
  // =========================
  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    default: null
  },

  googleId: {
    type: String,
    default: null
  },

  provider: {
    type: String,
    default: 'local',
    enum: ['local', 'google']
  },

  admin: {
    type: String,
    default: 'N'
  },

  // =========================
  // PROFILE INFO
  // =========================
  username: {
    type: String,
    default: ""
  },

  bio: {
    type: String,
    default: ""
  },

  chat_bio: {
    type: String,
    default: "Hey there! I am using ChatSphere"
  },
  
  favoriteGenre: {
    type: String,
    default: ""
  },

 profileImage: {
  type: String,
  default:
    "https://api.dicebear.com/7.x/adventurer/png?seed=reader"
},

  // =========================
  // USER BOOKS
  // =========================
  stash: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book'
  }],

  progress: [ProgressSchema],

  favorites: [{

    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },

    addedAt: {
      type: Date,
      default: Date.now
    }

  }],

  continueReading: [{

    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book'
    },

    lastOpenedAt: {
      type: Date,
      default: Date.now
    },

    source: {
      type: String,
      default: 'catalog'
    }

  }]

}, {
  timestamps: true
});

module.exports = mongoose.model(
  'User',
  UserSchema
);