const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/users/stash/:bookId — add book to user's stash
router.post('/stash/:bookId', auth, async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const alreadyInStash = req.user.stash.some((id) => id.toString() === bookId);
    if (!alreadyInStash) {
      req.user.stash.push(bookId);
      await req.user.save();
    }
    const stash = await User.findById(req.user._id).populate('stash');
    res.json(stash.stash);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/users/stash — get user's stash
router.get('/stash', auth, async (req, res) => {
  try {
    const stash = await User.findById(req.user._id).populate('stash');
    res.json(stash.stash);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/users/progress — update reading progress
router.post('/progress', auth, async (req, res) => {
  try {
    const { bookId, progress } = req.body;
    if (!bookId || typeof progress !== "number" || Number.isNaN(progress)) {
      return res.status(400).json({ msg: 'bookId and numeric progress are required' });
    }
    const safeProgress = Math.min(100, Math.max(0, progress));
    const existing = req.user.progress.find(p => p.bookId.toString() === bookId);
    if (existing) {
      existing.progress = safeProgress;
      existing.updatedAt = new Date();
    } else {
      req.user.progress.push({ bookId, progress: safeProgress, updatedAt: new Date() });
    }
    await req.user.save();
    res.json(req.user.progress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/users/progress/:bookId — get progress for a single book
router.get('/progress/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const existing = req.user.progress.find(p => p.bookId.toString() === bookId);
    res.json({ bookId, progress: existing ? existing.progress : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


router.put("/update-profile", async (req, res) => {

  try {

    const {
      email,
      name,
      username,
      bio,
      favoriteGenre,
      profileImage
    } = req.body;

    const updatedUser =
      await User.findOneAndUpdate(

        { email },

        {
          name,
          username,
          bio,
          favoriteGenre,
          profileImage
        },

        { new:true }
      );

    if(!updatedUser)
    {
      return res.status(404).json({
        error:"User not found"
      });
    }

    res.json(updatedUser);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      error:"Server Error"
    });
  }
});
router.get('/email/:email', async (req, res) => {

  try {

    const user = await User.findOne({
      email: req.params.email
    });

    if (!user) {

      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(user);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: 'Server error'
    });
  }
});

router.post("/sync", async (req, res) => {

  try {

    const userData = req.body;
console.log("Syncing user data:", userData);
    // FIND USER
    let user = await User.findOne({
      email: userData.email || userData.username
    });

    // DATA MAPPING
    const mappedData = {

      email:
        userData.email || userData.username,

      name:
        userData.name || userData.displayName,

      username:
        userData.username || '',

      chat_bio:
        userData.status || '',

      favoriteGenre:
        userData.favoriteGenre || '',

      profileImage:
        userData.profileImage || userData.avatar || '',

      // CHATSPHERE FIELDS
      id:
        userData.id,

      displayName:
        userData.displayName,

      avatar:
        userData.avatar,

      status:
        userData.status
    };

    // UPDATE
    if (user) {

      Object.assign(user, mappedData);

      await user.save();
    }

    // CREATE
    else {

      user = await User.create(mappedData);
    }

    res.json({
      success: true,
      user
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});
module.exports = router;
