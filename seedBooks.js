// seedBooks.js
const mongoose = require("mongoose");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const dotenv = require("dotenv");
const Book = require("./models/Book");

dotenv.config();

const GUTENDEX_URL = "https://gutendex.com/books";

// Categories from your <select> dropdown
const CATEGORIES = [
  // Fiction
  "General Fiction",
  "Mystery",
  "Humour",
  "Suspense",
  "Romance",
  "Fantasy",
  "Science Fiction",
  "Horror",
  "Adventure",
  // Non-Fiction
  "Biography",
  "Autobiography",
  "Self-Help",
  "Psychology",
  "Philosophy",
  "Science",
  "Politics",
  "Religion & Spirituality",
  "True Crime"
];

async function seedBooks() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true
    });
    console.log("✅ MongoDB connected");

    let allBooks = [];

    for (const category of CATEGORIES) {
      console.log(`📚 Fetching category: ${category}`);

      let url = `${GUTENDEX_URL}?topic=${encodeURIComponent(category)}`;
      let pageCount = 0;
      const maxPages = 2; // pages per category

      while (url && pageCount < maxPages) {
        console.log(`   📄 Page ${pageCount + 1} of ${category}`);
        const res = await fetch(url);
        const data = await res.json();

        if (!Array.isArray(data.results)) {
          console.warn(`⚠ No results for ${category}`);
          break;
        }

        const booksToInsert = data.results.map(book => ({
          title: book.title,
          author: (book.authors.map(a => a.name).join(", "))||"unknown author",
          description: book.summaries,
          genre: category,
          featured: false,
          fileUrl:
          book.formats["text/plain; charset=utf-8"] ||
            book.formats["text/html"] ||
            "#",
          coverUrl: book.formats["image/jpeg"] || "placeholder.jpg",
          releaseDate: new Date()
        }));

        allBooks = allBooks.concat(booksToInsert);

        url = data.next; // move to next page
        pageCount++;
      }
    }

    // Remove duplicates by title
    const uniqueBooks = [];
    const seenTitles = new Set();

    for (const book of allBooks) {
      if (!seenTitles.has(book.title)) {
        seenTitles.add(book.title);
        uniqueBooks.push(book);
      }
    }

    await Book.insertMany(uniqueBooks);
    console.log(`✅ Seeded ${uniqueBooks.length} unique books from Gutendex`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding books:", err);
    process.exit(1);
  }
}

seedBooks();
