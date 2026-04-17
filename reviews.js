const sampleAuthors = [
    'Aarav',
    'Mia',
    'Rohan',
    'Sophia',
    'Kabir',
    'Emily',
    'Ishita',
    'Noah',
    'Anaya',
    'Liam'
];

const reviewOpeners = [
    'A confident crowd-pleaser with sharp execution.',
    'One of those titles that keeps pulling you back in.',
    'A really satisfying watch from start to finish.',
    'Packed with memorable moments and strong performances.',
    'Easy to recommend if you enjoy polished storytelling.'
];

const libraryNotes = {
    Hollywood: 'It feels big, cinematic, and very polished.',
    Bollywood: 'The emotion and scale land really well here.',
    Korean: 'The pacing and character work make it especially gripping.',
    Indian: 'It balances entertainment and heart in a very engaging way.',
    International: 'It has a distinct style that makes it stand out.'
};

const genreCloser = (genre = '') => {
    const text = genre.toLowerCase();

    if (text.includes('thriller') || text.includes('crime')) return 'The tension stays strong and the payoff feels worth it.';
    if (text.includes('action')) return 'The action beats are clean and genuinely exciting.';
    if (text.includes('romance')) return 'The emotional beats feel warm and believable.';
    if (text.includes('comedy')) return 'It is funny without losing the story underneath.';
    if (text.includes('drama')) return 'The emotional scenes carry real weight.';
    if (text.includes('sci-fi') || text.includes('fantasy')) return 'The world-building is fun without overwhelming the characters.';
    if (text.includes('horror')) return 'It keeps the atmosphere tense in the best way.';

    return 'It stays engaging and leaves a strong impression by the end.';
};

const buildReviewBody = (movie, offset) => {
    const opener = reviewOpeners[offset % reviewOpeners.length];
    const libraryLine = libraryNotes[movie.library] || libraryNotes.International;
    const closer = genreCloser(movie.genre);

    return `${opener} ${libraryLine} ${closer}`;
};

const createDefaultReviews = (movie) => {
    const castLead = Array.isArray(movie.cast) && movie.cast.length ? movie.cast[0] : 'the lead cast';
    const titleSize = (movie.title || '').length;
    const baseDay = Math.max(1, (movie.year || 2000) % 28);

    return [0, 1, 2].map((offset) => ({
        author: {
            username: sampleAuthors[(titleSize + offset) % sampleAuthors.length]
        },
        rating: 5 - (offset === 2 ? 1 : 0),
        body: `${buildReviewBody(movie, titleSize + offset)} ${castLead} is especially memorable here.`,
        createdAt: new Date(Date.UTC(2025, (titleSize + offset) % 12, Math.min(28, baseDay + offset * 3)))
    }));
};

const ensureMovieReviews = async (movie) => {
    if (!movie) {
        return movie;
    }

    if (Array.isArray(movie.reviews) && movie.reviews.length) {
        return movie;
    }

    movie.reviews = createDefaultReviews(movie);
    await movie.save();
    return movie;
};

module.exports = {
    createDefaultReviews,
    ensureMovieReviews
};
