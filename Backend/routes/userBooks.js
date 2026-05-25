const express = require("express");
const router = express.Router();
const UserBooks = require("../models/UserBooks");

// Get user's books (favourites and continue reading)
router.get("/", async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    let userBooks = await UserBooks.findOne({ userEmail: email });

    if (!userBooks) {
      // Create new user books entry if none exists
      userBooks = new UserBooks({
        userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        userEmail: email,
        favourites: [],
        continueReading: []
      });
      await userBooks.save();
    } else {
      // Fix any existing entries without bookId or isVisible
      let needsSave = false;
      
      // Fix favourites
      userBooks.favourites = userBooks.favourites.map(book => {
        let updated = { ...book };
        if (!book.bookId) {
          needsSave = true;
          updated.bookId = book._id || book.externalId || (book.title + '|' + book.author);
        }
        if (book.isVisible === undefined) {
          needsSave = true;
          updated.isVisible = true;
        }
        return updated;
      });
      
      // Fix continueReading
      userBooks.continueReading = userBooks.continueReading.map(book => {
        let updated = { ...book };
        if (!book.bookId) {
          needsSave = true;
          updated.bookId = book._id || book.externalId || (book.title + '|' + book.author);
        }
        if (book.isVisible === undefined) {
          needsSave = true;
          updated.isVisible = true;
        }
        return updated;
      });
      
      if (needsSave) {
        await userBooks.save();
      }
    }

    res.json({
      favourites: userBooks.favourites,
      continueReading: userBooks.continueReading
    });
  } catch (err) {
    console.error("GET user books error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user's favourites
router.post("/favourites", async (req, res) => {
  try {
    const { email, book, action } = req.body;

    if (!email || !book || !action) {
      return res.status(400).json({ error: "Email, book, and action are required" });
    }

    let userBooks = await UserBooks.findOne({ userEmail: email });

    if (!userBooks) {
      userBooks = new UserBooks({
        userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        userEmail: email,
        favourites: [],
        continueReading: []
      });
    }

    const bookId = book._id || book.externalId || (book.title + '|' + book.author);
    const bookKey = bookId;
    const existingIndex = userBooks.favourites.findIndex(
      b => (b.fileUrl ||b._id || b.externalId || (b.title + '|' + b.author)) === bookKey
    );

    if (action === "add") {
      if (existingIndex === -1) {
        userBooks.favourites.unshift({ ...book, bookId, addedAt: new Date(), isVisible: true });
      }
    } else if (action === "remove") {
      if (existingIndex !== -1) {
        userBooks.favourites.splice(existingIndex, 1);
      }
    }

    await userBooks.save();
    res.json({
      favourites: userBooks.favourites,
      continueReading: userBooks.continueReading
    });
  } catch (err) {
    console.error("POST favourites error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user's continue reading (toggle add/remove)
router.post("/continue-reading", async (req, res) => {
  try {
    const { email, book, source } = req.body;

    if (!email || !book) {
      return res.status(400).json({ error: "Email and book are required" });
    }

    let userBooks = await UserBooks.findOne({ userEmail: email });

    if (!userBooks) {
      userBooks = new UserBooks({
        userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        userEmail: email,
        favourites: [],
        continueReading: []
      });
    }

    const bookId = book._id || book.externalId || (book.title + '|' + book.author);
    const bookKey = bookId;
    const existingIndex = userBooks.continueReading.findIndex(
      b => (b.fileUrl ||b._id || b.externalId || (b.title + '|' + b.author)) === bookKey
    );

    // Toggle: if exists, remove; else, add
    if (existingIndex !== -1) {
      // Remove from continue reading
      userBooks.continueReading.splice(existingIndex, 1);
    } else {
      // Add to continue reading (no duplicates)
      book.genre = Array.isArray(book.genre)
    ? book.genre.join(", ")
    : book.genre;

  book.description = Array.isArray(book.description)
    ? book.description.join(" ")
    : book.description;
      const newBook = {
        ...book,
        bookId,
        lastOpenedAt: new Date(),
        source: source || "catalog",
        isVisible: true
      };

      const middle = Math.floor(userBooks.continueReading.length / 2);
      userBooks.continueReading.splice(middle, 0, newBook);

      // Limit to 20 books
      if (userBooks.continueReading.length > 20) {
        userBooks.continueReading = userBooks.continueReading.slice(0, 20);
      }
    }

    await userBooks.save();
    res.json({
      favourites: userBooks.favourites,
      continueReading: userBooks.continueReading
    });
  } catch (err) {
    console.error("POST continue reading error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Toggle isVisible field for a book (in either favourites or continueReading)
router.post("/toggle-visible", async (req, res) => {
  try {
    const { email, book, section } = req.body; // section is "favourites" or "continueReading"

    if (!email || !book || !section) {
      return res.status(400).json({ error: "Email, book, and section are required" });
    }

    let userBooks = await UserBooks.findOne({ userEmail: email });

    if (!userBooks) {
      userBooks = new UserBooks({
        userId: `user_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        userEmail: email,
        favourites: [],
        continueReading: []
      });
    }

    const bookId = book.fileUrl || book._id || book.externalId || (book.title + '|' + book.author);
    const bookKey = bookId;
    let targetArray = section === "favourites" ? userBooks.favourites : userBooks.continueReading;

    const index = targetArray.findIndex(
      b => (b.fileUrl ||b._id || b.externalId || (b.title + '|' + b.author)) === bookKey
    );

    if (index !== -1) {
      targetArray[index].isVisible = !targetArray[index].isVisible;
    }

    await userBooks.save();
    res.json({
      favourites: userBooks.favourites,
      continueReading: userBooks.continueReading
    });
  } catch (err) {
    console.error("POST toggle-visible error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;