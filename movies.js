const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync');
const ExpressError = require('../utils/ExpressError');
const Movie = require('../models/movie'); // We will create this model next
const { movieSchema } = require('../schemas.js'); // We will create this next
const { hydrateMoviePosters, syncPosterFields } = require('../utils/posters');
const { ensureMovieReviews } = require('../utils/reviews');

const requireLogin = (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        req.flash('error', 'Please log in to add a review.');
        return res.redirect('/login');
    }
    next();
};

const normalizeMoviePayload = (movie = {}) => {
    const cast = typeof movie.cast === 'string'
        ? movie.cast.split(',').map(name => name.trim()).filter(Boolean)
        : Array.isArray(movie.cast)
            ? movie.cast.map(name => String(name).trim()).filter(Boolean)
            : [];
    const poster = (movie.poster || movie.image || '').trim();

    return {
        ...movie,
        type: movie.type || 'Movie',
        library: movie.library || 'Hollywood',
        cast,
        poster,
        image: poster
    };
};

// Middleware for validation
const validateMovie = (req, res, next) => {
    const { error } = movieSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(msg, 400);
    } else {
        next();
    }
}

router.get('/', catchAsync(async (req, res) => {
    const movies = await Movie.find({}).sort({ imdbRating: -1, year: -1, title: 1 });
    await hydrateMoviePosters(movies);
    const featured = movies.find(movie => movie.library === 'Bollywood' && movie.year >= 2025) || movies[0];
    const movieItems = movies.filter(movie => movie.type === 'Movie');
    const tvItems = movies.filter(movie => movie.type === 'TV Series');
    const bollywoodItems = movies.filter(movie => movie.library === 'Bollywood');
    const tollywoodItems = movies.filter(movie => movie.library === 'Tollywood');
    const southIndianItems = movies.filter(movie => movie.library === 'South Indian');
    const koreanItems = movies.filter(movie => movie.library === 'Korean' && movie.type === 'TV Series');
    const animationItems = movies.filter(movie => movie.type === 'Movie' && /animation/i.test(movie.genre || ''));
    const topAnimation = [...animationItems].sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year)[0];
    const animationRecentCount = animationItems.filter(movie => movie.year >= 2020).length;
    const animationHighlights = [
        `${animationItems.length} animated titles ready to explore`,
        `${animationRecentCount} releases from 2020 onward`,
        topAnimation ? `Top rated pick: ${topAnimation.title} (${topAnimation.imdbRating}/10)` : 'Family favorites and modern animated hits'
    ];
    const sections = [
        {
            id: 'top-movies',
            title: 'Top Movies',
            subtitle: 'Highest-rated films across the catalog',
            items: movieItems.slice(0, 18)
        },
        {
            id: 'animation-movies',
            title: 'Animation Movies',
            subtitle: 'Animated adventures, family favorites, and modern classics',
            highlights: animationHighlights,
            items: [...animationItems].sort((a, b) => b.year - a.year || b.imdbRating - a.imdbRating || a.title.localeCompare(b.title)).slice(0, 18)
        },
        {
            id: 'tv-series',
            title: 'TV Series',
            subtitle: 'Binge-worthy shows from every corner of the library',
            items: tvItems.slice(0, 18)
        },
        {
            id: 'bollywood',
            title: 'Latest Bollywood Movies',
            subtitle: 'Recent Hindi releases plus modern favorites',
            items: [...bollywoodItems].sort((a, b) => b.year - a.year || b.imdbRating - a.imdbRating).slice(0, 18)
        },
        {
            id: 'tollywood',
            title: 'Tollywood Blockbusters',
            subtitle: 'Telugu crowd-pleasers, fantasy epics, and new-age favorites',
            items: [...tollywoodItems].sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year || a.title.localeCompare(b.title)).slice(0, 18)
        },
        {
            id: 'south-indian',
            title: 'South Indian Hits',
            subtitle: 'Tamil, Malayalam, and Kannada standouts across action, drama, and thrillers',
            items: [...southIndianItems].sort((a, b) => b.imdbRating - a.imdbRating || b.year - a.year || a.title.localeCompare(b.title)).slice(0, 18)
        },
        {
            id: 'korean-dramas',
            title: 'Korean Dramas',
            subtitle: 'Popular K-dramas and thrillers',
            items: koreanItems.slice(0, 18)
        },
        {
            id: 'recently-added',
            title: 'Recently Added',
            subtitle: 'Newest titles available right now',
            items: [...movies].sort((a, b) => b.year - a.year || b.imdbRating - a.imdbRating).slice(0, 18)
        }
    ].filter(section => section.items.length > 0);
    res.render('movies/index', { movies, featured, sections });
}));

router.get('/new', (req, res) => {
    res.render('movies/new');
});

router.post('/', validateMovie, catchAsync(async (req, res) => {
    const movie = new Movie(normalizeMoviePayload(req.body.movie));
    await movie.save();
    await syncPosterFields(movie);
    req.flash('success', 'Successfully added a new movie!');
    res.redirect(`/movies/${movie._id}`);
}));

router.post('/:id/reviews', requireLogin, catchAsync(async (req, res) => {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
        req.flash('error', 'Cannot find that movie!');
        return res.redirect('/movies');
    }

    const rating = Number(req.body.review && req.body.review.rating);
    const body = String(req.body.review && req.body.review.body || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !body) {
        req.flash('error', 'Please provide a rating from 1 to 5 and write a review.');
        return res.redirect(`/movies/${movie._id}`);
    }

    movie.reviews.push({
        author: {
            id: req.user._id,
            username: req.user.username
        },
        rating,
        body
    });

    await movie.save();
    req.flash('success', 'Your review was added.');
    res.redirect(`/movies/${movie._id}`);
}));

router.get('/:id', catchAsync(async (req, res) => {
    const movie = await Movie.findById(req.params.id);
    if(!movie){
        req.flash('error', 'Cannot find that movie!');
        return res.redirect('/movies');
    }
    await syncPosterFields(movie);
    await ensureMovieReviews(movie);
    res.render('movies/show', { movie });
}));

router.get('/:id/edit', catchAsync(async (req, res) => {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
        req.flash('error', 'Cannot find that movie!');
        return res.redirect('/movies');
    }
    res.render('movies/edit', { movie });
}));

router.put('/:id', validateMovie, catchAsync(async (req, res) => {
    const movie = await Movie.findByIdAndUpdate(
        req.params.id,
        normalizeMoviePayload(req.body.movie),
        { new: true, runValidators: true }
    );
    if (!movie) {
        req.flash('error', 'Cannot find that movie!');
        return res.redirect('/movies');
    }
    await syncPosterFields(movie);
    req.flash('success', 'Successfully updated the movie!');
    res.redirect(`/movies/${movie._id}`);
}));

router.delete('/:id', catchAsync(async (req, res) => {
    await Movie.findByIdAndDelete(req.params.id);
    req.flash('success', 'Successfully deleted the movie.');
    res.redirect('/movies');
}));

module.exports = router;
