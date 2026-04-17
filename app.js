const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');

// Models & Utilities
const User = require('./models/user');
const Movie = require('./models/movie');
const ExpressError = require('./utils/ExpressError');
const catchAsync = require('./utils/catchAsync');
const { hydrateMoviePosters } = require('./utils/posters');

// Routes Setup
const movieRoutes = require('./routes/movies');
const userRoutes = require('./routes/users');

// Database Connection
mongoose.connect('mongodb://127.0.0.1:27017/cineverse')
    .then(async () => {
        console.log('Database Connected');

        try {
            const movies = await Movie.find({});
            await hydrateMoviePosters(movies);
            console.log(`Poster sync completed for ${movies.length} titles.`);
        } catch (err) {
            console.log('Poster Sync Error:', err);
        }
    })
    .catch(err => console.log('Database Connection Error:', err));

const app = express();
const port = Number(process.env.PORT) || 3000;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
const sessionConfig = {
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 1 week
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};
app.use(session(sessionConfig));
app.use(flash());

// Passport Configuration (MUST be below session)
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Global Middleware for Flash Messages & Current User
app.use((req, res, next) => {
    res.locals.currentUser = req.user; // Makes user data available in all EJS templates
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Use Router Files
app.use('/', userRoutes);
app.use('/movies', movieRoutes);

// Landing Page Route
app.get('/', (req, res) => {
    res.render('index');
});

// Search Route
app.get('/search', catchAsync(async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!query) {
        return res.render('search', { movies: [], query: '', resultCount: 0 });
    }

    const pattern = new RegExp(escapeRegex(query), 'i');
    const movies = await Movie.find({
        $or: [
            { title: pattern },
            { genre: pattern },
            { director: pattern },
            { cast: pattern },
            { type: pattern },
            { library: pattern },
            { description: pattern }
        ]
    }).sort({ imdbRating: -1, year: -1, title: 1 });
    await hydrateMoviePosters(movies);

    res.render('search', { movies, query, resultCount: movies.length });
}));

// 404 Handler (Catch-all)
app.all(/(.*)/, (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

// Global Error Handler
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!';
    res.status(statusCode).render('error', { err });
});

app.listen(port, () => {
    console.log(`Serving on port ${port}`);
});
