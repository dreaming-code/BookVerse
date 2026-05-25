const mongoose = require("mongoose");

// =========================
// BOOK SUB SCHEMA
// =========================
const bookSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true
    },

    title: {
      type: String,
      required: true,
      trim: true
    },

    author: {
      type: String,
      default: "Unknown Author"
    },

    genre: {
      type: String,
      default: "General"
    },

    description: {
      type: String,
      default: ""
    },

    coverUrl: {
      type: String,
      default: ""
    },

    fileUrl: {
      type: String,
      default: "#"
    },

    externalId: {
      type: String,
      default: null
    }
  },
  {
    _id: false
  }
);

// =========================
// CONTINUE READING SCHEMA
// =========================
const continueReadingSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true
    },

    title: {
      type: String,
      required: true
    },

    author: {
      type: String,
      default: "Unknown Author"
    },

    genre: {
      type: String,
      default: "General"
    },

    description: {
      type: String,
      default: ""
    },

    coverUrl: {
      type: String,
      default: ""
    },

    fileUrl: {
      type: String,
      default: "#"
    },

    externalId: {
      type: String,
      default: null
    },

    source: {
      type: String,
      default: "catalog"
    },

    lastOpenedAt: {
      type: Date,
      default: Date.now
    },

    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

// =========================
// FAVORITE BOOK SCHEMA
// =========================
const favouriteBookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true
    },

    title: {
      type: String,
      required: true
    },

    author: {
      type: String,
      default: "Unknown Author"
    },

    genre: {
      type: String,
      default: "General"
    },

    description: {
      type: String,
      default: ""
    },

    coverUrl: {
      type: String,
      default: ""
    },

    fileUrl: {
      type: String,
      default: "#"
    },

    externalId: {
      type: String,
      default: null
    },

    addedAt: {
      type: Date,
      default: Date.now
    },

    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    _id: false
  }
);

// =========================
// USER BOOKS SCHEMA
// =========================
const userBookSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },

    userEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    // =========================
    // FAVORITES
    // =========================
    favourites: {
      type: [favouriteBookSchema],
      default: []
    },

    // =========================
    // CONTINUE READING / STASH
    // =========================
    continueReading: {
      type: [continueReadingSchema],
      default: []
    },

    // =========================
    // USER ADDED BOOKS
    // =========================
    addedBooks: {
      type: [bookSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// =========================
// COMPOUND INDEX
// =========================
userBookSchema.index(
  {
    userId: 1,
    userEmail: 1
  },
  {
    unique: true
  }
);

// =========================
// HELPER METHODS
// =========================

// Generate consistent unique key
userBookSchema.methods.getBookKey = function (book) {
  return (
    book.externalId ||
    `${book.title}|${book.author}`
  );
};

// =========================
// REMOVE DUPLICATES
// =========================
userBookSchema.methods.removeDuplicateBooks = function () {

  const uniqueFavorites = [];
  const favoriteKeys = new Set();

  this.favourites.forEach(book => {

    const key =
      book.externalId ||
      `${book.title}|${book.author}`;

    if (!favoriteKeys.has(key)) {

      favoriteKeys.add(key);

      uniqueFavorites.push(book);
    }
  });

  this.favourites = uniqueFavorites;

  const uniqueContinueReading = [];
  const continueKeys = new Set();

  this.continueReading.forEach(book => {

    const key =
      book.externalId ||
      `${book.title}|${book.author}`;

    if (!continueKeys.has(key)) {

      continueKeys.add(key);

      uniqueContinueReading.push(book);
    }
  });

  this.continueReading = uniqueContinueReading;

  const uniqueAddedBooks = [];
  const addedBookKeys = new Set();

  this.addedBooks.forEach(book => {

    const key =
      book.externalId ||
      `${book.title}|${book.author}`;

    if (!addedBookKeys.has(key)) {

      addedBookKeys.add(key);

      uniqueAddedBooks.push(book);
    }
  });

  this.addedBooks = uniqueAddedBooks;
};

// =========================
// PRE SAVE MIDDLEWARE
// =========================
userBookSchema.pre("save", function (next) {

  // Clean duplicate books before saving
  this.removeDuplicateBooks();

  next();
});

// =========================
// EXPORT MODEL
// =========================
module.exports = mongoose.model(
  "UserBooks",
  userBookSchema
);