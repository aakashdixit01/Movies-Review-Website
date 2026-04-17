const { createPosterDataUri } = require('./localMedia');
const { fetchTmdbPoster, isTmdbImageUrl } = require('./tmdb');

const isGeneratedPoster = (value = '') => /^data:image\/svg\+xml/i.test(String(value).trim());

const isUnreliablePosterSource = (value = '') => /dummyimage\.com|fzmovies\.net/i.test(String(value).trim());

const shouldResolvePoster = (movie = {}) => {
    const currentPoster = movie.poster || '';
    return !currentPoster || isUnreliablePosterSource(currentPoster);
};

const syncPosterFields = async (movie, options = {}) => {
    if (!movie) {
        return movie;
    }

    const { tryTmdb = false } = options;
    const currentPoster = String(movie.poster || '').trim();
    const currentImage = String(movie.image || '').trim();
    const fallbackPoster = createPosterDataUri(movie);
    const needsTmdbLookup = tryTmdb && (shouldResolvePoster(movie) || isGeneratedPoster(currentPoster));
    const tmdbMatch = needsTmdbLookup ? await fetchTmdbPoster(movie).catch(() => null) : null;
    const tmdbPoster = tmdbMatch && tmdbMatch.poster ? tmdbMatch.poster : '';

    const resolvedPoster = tmdbPoster || (shouldResolvePoster(movie) ? fallbackPoster : currentPoster);
    const resolvedFallback = isGeneratedPoster(currentImage) ? currentImage : fallbackPoster;

    if (movie.poster !== resolvedPoster || movie.image !== resolvedFallback) {
        movie.poster = resolvedPoster;
        movie.image = resolvedFallback;
        await movie.save();
    }
    return movie;
};

const hydrateMoviePosters = async (movies = []) => {
    const items = movies.filter(Boolean);
    const concurrency = 3;

    for (let index = 0; index < items.length; index += concurrency) {
        const batch = items.slice(index, index + concurrency);
        await Promise.all(batch.map(syncPosterFields));
    }

    return movies;
};

module.exports = {
    hydrateMoviePosters,
    syncPosterFields
};
