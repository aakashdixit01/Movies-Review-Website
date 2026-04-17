const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/user');
const Movie = require('../models/movie');
const catchAsync = require('../utils/catchAsync');
const { createAvatarDataUri } = require('../utils/localMedia');

const defaultAvatar = (username = 'CineVerse User') => createAvatarDataUri(username);

const requireLogin = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        req.flash('error', 'Please log in to view your profile.');
        return res.redirect('/login');
    }
    next();
};

const normalizeList = (value = '') => String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

// Render Sign Up Page
router.get('/register', (req, res) => {
    res.render('users/register');
});

// Handle Sign Up Logic
router.post('/register', catchAsync(async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({
            email,
            username,
            profilePicture: defaultAvatar(username)
        });
        const registeredUser = await User.register(user, password);
        
        // Log the user in immediately after signing up
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to CineVerse!');
            res.redirect('/movies');
        });
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/register');
    }
}));

// Render Login Page
router.get('/login', (req, res) => {
    res.render('users/login');
});

// Handle Login Logic
router.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), (req, res) => {
    req.flash('success', 'Welcome back!');
    res.redirect('/movies');
});

router.get('/profile', requireLogin, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    const reviewedMovies = await Movie.find({ 'reviews.author.id': user._id }).sort({ year: -1, title: 1 });

    const reviewEntries = reviewedMovies.flatMap(movie =>
        (movie.reviews || [])
            .filter(review => review.author && String(review.author.id) === String(user._id))
            .map(review => ({
                movieId: movie._id,
                title: movie.title,
                type: movie.type,
                library: movie.library,
                poster: movie.poster || movie.image,
                rating: review.rating,
                body: review.body,
                createdAt: review.createdAt
            }))
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const profile = {
        ...user.toObject(),
        profilePicture: user.profilePicture || defaultAvatar(user.username),
        favoriteGenresText: (user.favoriteGenres || []).join(', '),
        favoriteTitlesText: (user.favoriteTitles || []).join(', ')
    };

    const stats = {
        reviews: reviewEntries.length,
        averageRating: reviewEntries.length
            ? (reviewEntries.reduce((sum, review) => sum + review.rating, 0) / reviewEntries.length).toFixed(1)
            : null,
        favorites: (user.favoriteTitles || []).length
    };

    res.render('users/profile', { profile, reviewEntries, stats });
}));

router.put('/profile', requireLogin, catchAsync(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        req.flash('error', 'Profile not found.');
        return res.redirect('/movies');
    }

    const profilePicture = String(req.body.profilePicture || '').trim();

    user.email = String(req.body.email || user.email).trim();
    user.gender = String(req.body.gender || '').trim();
    user.age = req.body.age ? Number(req.body.age) : undefined;
    user.bio = String(req.body.bio || '').trim();
    user.favoriteGenres = normalizeList(req.body.favoriteGenres);
    user.favoriteTitles = normalizeList(req.body.favoriteTitles);
    user.profilePicture = profilePicture || defaultAvatar(user.username);

    await user.save();
    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
}));

// Handle Logout
router.get('/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        req.flash('success', "Goodbye!");
        res.redirect('/movies');
    });
});

module.exports = router;
