const express = require('express');
const router = express.Router();

const PendingBook = require('../models/PendingBook');
const Book = require('../models/Book');
const auth = require('../middleware/authMiddleware');

// =========================
// SUBMIT BOOK FOR REVIEW
// =========================
router.post('/submit', async (req, res) => {

  try {

    const {
      title,
      author,
      description,
      genre,
      coverUrl,
      fileUrl,
      submittedByEmail,
      submittedByName
    } = req.body;
console.log("Received submission:", req.body);
    // =========================
    // VALIDATION
    // =========================
    if (!title || !author || !fileUrl) {

      return res.status(400).json({
        error: 'Title, author and file URL are required'
      });
    }

    // =========================
    // URL VALIDATION
    // =========================
    const urlPattern =
      /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

    if (coverUrl && !urlPattern.test(coverUrl)) {

      return res.status(400).json({
        error: 'Invalid cover URL format'
      });
    }

    if (!urlPattern.test(fileUrl)) {

      return res.status(400).json({
        error: 'Invalid file URL format'
      });
    }

    // =========================
    // SANITIZE
    // =========================
    const sanitize = (str) => {

      if (!str) return '';

      return String(str).trim();
    };

    // =========================
    // CHECK DUPLICATE IN PENDING
    // =========================
    const existingPendingBook =
      await PendingBook.findOne({

        title: sanitize(title),

        author: sanitize(author),

        fileUrl: sanitize(fileUrl)
      });

    if (existingPendingBook) {

      return res.status(400).json({
        error: 'This book is already submitted'
      });
    }

    // =========================
    // CHECK DUPLICATE IN BOOKS
    // =========================
    const existingBook =
      await Book.findOne({

        title: sanitize(title),

        author: sanitize(author),

        fileUrl: sanitize(fileUrl)
      });

    if (existingBook) {

      return res.status(400).json({
        error: 'This book already exists in library'
      });
    }

    // =========================
    // CREATE PENDING BOOK
    // =========================
    const pendingBook = new PendingBook({

      title: sanitize(title),

      author: sanitize(author),

      description: sanitize(description),

      genre: sanitize(genre || 'General'),

      coverUrl: sanitize(coverUrl),

      fileUrl: sanitize(fileUrl),

      submittedBy:{
        email: sanitize(submittedByEmail),
        name: sanitize(submittedByName)
      },
      status: 'PENDING'
    });
console.log("Saving pending book:", pendingBook);
    await pendingBook.save();

    res.status(201).json({

      success: true,

      message: 'Book submitted for review',

      pendingBook
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// =========================
// GET USER SUBMITTED BOOKS
// =========================
router.get('/my', async (req, res) => {
  try {

    const email = req.query.email;
console.log("email : ",email);
    if (!email) {

      return res.status(400).json({
        error: 'Email is required'
      });
    }

    const books = await PendingBook.find({
  "submittedBy.email": email
}).sort({ createdAt: -1 });

    res.json(books);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// =========================
// GET ALL PENDING BOOKS
// ADMIN ONLY
// =========================
router.get('/', auth, async (req, res) => {

  try {

    // =========================
    // ADMIN CHECK
    // =========================
    if (req.user.admin !== 'Y') {

      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // =========================
    // ONLY SHOW PENDING
    // =========================
    const pendingBooks =
      await PendingBook.find({
        status: 'PENDING'
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(pendingBooks);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// =========================
// APPROVE BOOK
// ADMIN ONLY
// =========================
router.post('/approve/:id', auth, async (req, res) => {

  try {

    // =========================
    // ADMIN CHECK
    // =========================
    if (req.user.admin !== 'Y') {

      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // =========================
    // FIND PENDING BOOK
    // =========================
    const pendingBook =
      await PendingBook.findById(req.params.id);

    if (!pendingBook) {

      return res.status(404).json({
        error: 'Pending book not found'
      });
    }

    // =========================
    // CHECK IF ALREADY EXISTS
    // =========================
    const existingBook =
      await Book.findOne({

        title: pendingBook.title,

        author: pendingBook.author,

        fileUrl: pendingBook.fileUrl
      });

    // =========================
    // ADD TO MAIN BOOKS
    // =========================
    console.log("pendingBook =", pendingBook);
    if (!existingBook) {

      await Book.create({

        title: pendingBook.title,

        author: pendingBook.author,

        description: pendingBook.description,

        genre: pendingBook.genre,

        coverUrl: pendingBook.coverUrl,

        fileUrl: pendingBook.fileUrl,

        submittedByEmail:
          pendingBook.submittedBy.email,

        submittedByName:
          pendingBook.submittedBy.name
      });
    }

    // =========================
    // UPDATE STATUS
    // =========================
    pendingBook.status = 'APPROVED';

    await pendingBook.save();

    res.json({

      success: true,

      message: 'Book approved successfully'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

// =========================
// REJECT BOOK
// ADMIN ONLY
// =========================
router.post('/reject/:id', auth, async (req, res) => {

  try {

    // =========================
    // ADMIN CHECK
    // =========================
    if (req.user.admin !== 'Y') {

      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // =========================
    // FIND BOOK
    // =========================
    const pendingBook =
      await PendingBook.findById(req.params.id);

    if (!pendingBook) {

      return res.status(404).json({
        error: 'Pending book not found'
      });
    }

    // =========================
    // UPDATE STATUS ONLY
    // =========================
    pendingBook.status = 'REJECTED';

    await pendingBook.save();

    res.json({

      success: true,

      message: 'Book rejected'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

module.exports = router;