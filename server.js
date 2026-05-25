const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fetch = require("node-fetch");
const passport = require("passport");
const Book = require("./Backend/models/Book");

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json({
  limit: "50mb"
}));

app.use(express.urlencoded({
  limit: "50mb",
  extended: true
}));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(passport.initialize());

// Connect to MongoDB
if (process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));
}


// ✅ Mount your API routes FIRST
app.use("/api/auth", require("./Backend/routes/auth"));
app.use("/api/books", require("./Backend/routes/books"));
app.use("/api/users", require("./Backend/routes/users"));
app.use("/api/pending-books", require("./Backend/routes/pendingBooks"));
app.use("/api/user-books", require("./Backend/routes/userBooks"));
app.use("/api/chat", require("./Backend/routes/chat"));

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();

app.get("/api/search", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing query" });
  const normalizedQuery = query.trim().toLowerCase();
  const start = Date.now();

  const cached = searchCache.get(normalizedQuery);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[perf] /api/search cache hit query="${normalizedQuery}" took=${Date.now() - start}ms`);
    return res.json(cached.results);
  }

  try {
    // First search in our own DB
    const dbResults = await Book.find({
      $or: [
        { title: { $regex: normalizedQuery, $options: "i" } },
        { author: { $regex: normalizedQuery, $options: "i" } }
      ]
    }).lean();
 if (dbResults.length > 3) {
      console.log("Returning DB books, skipping Gutendex");

      return res.json(dbResults);
    }
    // Then search Gutendex API
    const response = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`);
    
    let gutendexResults = [];
    if (response.ok) {
      const data = await response.json();
      gutendexResults = Array.isArray(data.results) ? data.results : [];
    }

    // Combine results, DB first
    const combinedResults = [...dbResults, ...gutendexResults];
    
    searchCache.set(normalizedQuery, {
      results: combinedResults,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
    });
    
    console.log(`[perf] /api/search query="${normalizedQuery}" took=${Date.now() - start}ms (DB: ${dbResults.length}, Gutendex: ${gutendexResults.length})`);
    res.json(combinedResults);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error while searching" });
  }
});



// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));


// Catch-all to serve library.html for unknown routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "library.html"));
});





if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
