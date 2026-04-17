const mongoose = require('mongoose');
const Movie = require('../models/movie');
const { syncPosterFields } = require('../utils/posters');

const run = async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/cineverse');
    console.log('Database Connected');

    const movies = await Movie.find({}).sort({ title: 1, year: 1 });
    console.log(`Syncing TMDb posters for ${movies.length} titles...`);

    const concurrency = 3;
    let updated = 0;

    for (let index = 0; index < movies.length; index += concurrency) {
        const batch = movies.slice(index, index + concurrency);
        const beforeValues = batch.map(movie => movie.poster);

        await Promise.all(batch.map(movie => syncPosterFields(movie, { tryTmdb: true })));

        batch.forEach((movie, movieIndex) => {
            if (movie.poster !== beforeValues[movieIndex]) {
                updated += 1;
            }
        });

        console.log(`Processed ${Math.min(index + concurrency, movies.length)}/${movies.length}`);
    }

    console.log(`Poster sync completed. Updated ${updated} titles.`);
};

run()
    .then(() => mongoose.connection.close())
    .catch(async (err) => {
        console.error('TMDb poster sync failed:', err);
        await mongoose.connection.close();
        process.exit(1);
    });
