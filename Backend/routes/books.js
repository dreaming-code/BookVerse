const express = require("express");
const multer = require("multer");
const path = require("path");
const Book = require("../models/Book");
const axios = require("axios");

const router = express.Router();

// ===== Storage Config =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
// ===== ADD BOOK =====
router.post("/add", upload.single("coverImage"), async (req, res) => {
  try {
    let { title, author, description, genre, featured, fileUrl } = req.body;

    // ✅ Handle genre as array
    if (typeof genre === "string") {
      genre = [genre]; // convert single → array
    }

    // ✅ Handle featured
    const isFeatured =
      featured === true ||
      featured === "true" ||
      featured === "on" ||
      featured === "1";

    // ✅ Handle uploaded image
    let coverUrl = "";
    if (req.file) {
      coverUrl = `/uploads/${req.file.filename}`;
    }

    const newBook = new Book({
      title,
      author,
      description: description || "",
      genre: genre || ["General"], // array
      featured: isFeatured,
      fileUrl,
      coverUrl
    });

    console.log("Adding book:", newBook);

    await newBook.save();

    res.status(201).json({
      message: "Book added successfully",
      book: newBook
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// ===== GET BOOKS (FILTER + SEARCH) =====
router.get("/", async (req, res) => {
  try {
    const { genre, featured, search } = req.query;

    const query = {};
    
    console.log("Received query params:", {
      genre,
      featured,
      search
    });

    // =========================
    // GENRE FILTER
    // =========================
    if (genre && genre !== "all") {
      const genres = genre
        .split(",")
        .map((g) => new RegExp(`^${g}$`, "i"));

      query.genre = { $in: genres };
    }

    // =========================
    // FEATURED FILTER
    // =========================
    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    // =========================
    // SEARCH FILTER
    // =========================
    if (search && search.trim() !== "") {
  const regex = new RegExp(search.trim(), "i");

  query.$or = [
    { title: regex },
    { genre: regex },
    { author: regex }
  ];
}

    console.log("Querying MongoDB with:", query);

    // =========================
    // SEARCH IN DATABASE
    // =========================
    const dbBooks = await Book.find(query)
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Found ${dbBooks.length} books in DB`);

    // ✅ IF FOUND IN DB → RETURN
    if (dbBooks.length > 3) {
      console.log("Returning DB books, skipping Gutendex");

      return res.json(dbBooks);
    }

    // =========================
    // SEARCH GUTENDEX API
    // =========================
    console.log("No books in DB, searching Gutendex...");

    let apiSearchText = "books";

    if (search && search.trim() !== "") {
      apiSearchText = search.trim();
    } else if (genre && genre !== "all") {
      apiSearchText = genre;
    }

    console.log("Gutendex search text:", apiSearchText);

    const response = await axios.get(
      `https://gutendex.com/books?search=${encodeURIComponent(apiSearchText)}`,
      {
        timeout: 90000
      }
    );

    const apiBooks = response.data.results || [];

    console.log(`Found ${apiBooks.length} books from Gutendex`);

    // =========================
    // FORMAT API DATA
    // =========================
    const formattedBooks = apiBooks.map((book) => ({
      externalId: `gutendex-${book.id}`,

      title: book.title || "Untitled",

      author:
        book.authors?.map((a) => a.name).join(", ") ||
        "Unknown Author",

      description:
        book.summaries?.join(" ") ||
        `A ${
          book.bookshelves?.[0] || "classic"
        } book by ${
          book.authors?.map((a) => a.name).join(", ") ||
          "Unknown Author"
        } covering ${
          book.subjects?.slice(0, 4).join(", ") ||
          "literature and storytelling"
        }.`,

      genre:
        book.subjects?.slice(0, 3) || ["General"],

      coverUrl:
        book.formats?.["image/jpeg"] || "",

      fileUrl:
        book.formats?.["text/html"] ||
        book.formats?.["application/epub+zip"] ||
        `https://www.gutenberg.org/ebooks/${book.id}`,

      source: "gutendex"
    }));

    return res.json(formattedBooks);

  } catch (err) {
    console.error("Error fetching books:", err);

    return res.status(500).json({
      message: err.message
    });
  }
});
// ===== ADD BOOK (with submittedBy info)
router.post("/", async (req, res) => {
  try {
    let { title, author, description, genre, fileUrl, coverUrl, submittedByEmail, submittedByName } = req.body;

    if (typeof genre === "string") {
      genre = [genre];
    }

    const newBook = new Book({
      title,
      author,
      description: description || "",
      genre: genre || ["General"],
      fileUrl,
      coverUrl,
      submittedByEmail,
      submittedByName
    });

    await newBook.save();

    res.status(201).json({
      message: "Book added successfully",
      book: newBook
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// ===== GET BOOKS BY USER =====
router.get("/my", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const books = await Book.find({ 
      $or: [
        { submittedByEmail: email },
        // Also check pending books that were approved
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    // Also get approved pending books
    const PendingBook = require("../models/PendingBook");
    const approvedPending = await PendingBook.find({ 
      submittedByEmail: email, 
      status: "APPROVED" 
    }).lean();

    const allBooks = [...books, ...approvedPending.map(pb => ({
      ...pb,
      _id: pb._id
    }))];

    // Remove duplicates (if any)
    const uniqueBooks = [];
    const seenIds = new Set();
    allBooks.forEach(book => {
      if (!seenIds.has(book._id.toString())) {
        seenIds.add(book._id.toString());
        uniqueBooks.push(book);
      }
    });

    res.json(uniqueBooks);

  } catch (err) {
    console.error("Error fetching user books:", err);
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;