const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const router = express.Router();

// JWT token generator helper
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Configure Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;
      
      // Check if user already exists
      let user = await User.findOne({ email });
      
      if (user) {
        // If user exists but doesn't have googleId, update it
        if (!user.googleId) {
          user.googleId = googleId;
          user.provider = 'google';
          await user.save();
        }
        return done(null, user);
      }
      
      // Create new user from Google profile
      const newUser = new User({
        name: profile.displayName || email.split('@')[0],
        email: email,
        googleId: googleId,
        provider: 'google',
        password: null,
        admin: 'N'
      });
      
      await newUser.save();
      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }));
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  const redirect = req.query.redirect || 'library';
  // Use Passport's state option to carry the redirect parameter
  passport.authenticate('google', { 
    scope: ['profile', 'email'], 
    session: false,
    state: redirect
  })(req, res, next);
});

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/library.html', session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    const userData = { id: req.user._id, name: req.user.name, email: req.user.email, admin: req.user.admin };
    const redirect = req.query.state || 'library';
    let redirectPath;
    if (redirect === 'chat') {
      redirectPath = '/chat.html';
    } else {
      redirectPath = '/library.html';
    }
    const redirectUrl = `${process.env.CLIENT_URL || 'http://localhost:5078'}${redirectPath}?auth=google&token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  }
);

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, email, password: hashedPassword, provider: 'local' });
    await user.save();

    const token = generateToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, admin: user.admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password , admin } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    
    // Check if user is OAuth-only
    if (user.provider === 'google' && !user.password) {
      return res.status(400).json({ msg: 'Please login with Google' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });
    if (admin && admin !== user.admin) {
      return res.status(403).json({ msg: 'Unauthorized access' });
    }
    const token = generateToken(user._id);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, admin: user.admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', auth, async (req, res) => {
  try {
    res.json({ msg: 'Logged out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/auth/me (protected)
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
