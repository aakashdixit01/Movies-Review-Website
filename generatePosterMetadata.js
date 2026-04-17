const fs = require('fs');
const path = require('path');
const animationCatalog = require('../seeds/animationCatalog.json');
const animationMetadata = require('../seeds/animationMetadata');
const indiaCinemaCatalog = require('../seeds/indiaCinemaCatalog');
const moreMoviesCatalog = require('../seeds/moreMoviesCatalog');
const { fetchTmdbPoster } = require('../utils/tmdb');

const metadataPath = path.join(__dirname, '..', 'seeds', 'titleMetadata.js');
const seedIndexPath = path.join(__dirname, '..', 'seeds', 'index.js');

const parseLine = (line, type) => {
    const [title, year] = line.split('|');
    return { title, year: Number(year), type };
};

const extractEntriesFromSeedIndex = () => {
    const source = fs.readFileSync(seedIndexPath, 'utf8');
    const entries = [];
    const arrayPattern = /const\s+(movieCatalog|tvCatalog)\s*=\s*\[((?:.|\r|\n)*?)\]\.map\(line => parseEntry\(line, '(Movie|TV Series)'\)\);/g;
    let arrayMatch;

    while ((arrayMatch = arrayPattern.exec(source)) !== null) {
        const [, , body, type] = arrayMatch;
        const linePattern = /'([^']+\|\d{4}\|[^']+)'/g;
        let lineMatch;

        while ((lineMatch = linePattern.exec(body)) !== null) {
            entries.push(parseLine(lineMatch[1], type));
        }
    }

    return entries;
};

const collectEntries = () => {
    const seen = new Map();
    const add = (entry) => {
        const key = `${entry.title.toLowerCase()}::${entry.year}::${entry.type}`;
        if (!seen.has(key)) {
            seen.set(key, entry);
        }
    };

    extractEntriesFromSeedIndex().forEach(add);
    animationCatalog.slice(0, 100).forEach(entry => add({ title: entry.title, year: Number(entry.year), type: 'Movie' }));
    indiaCinemaCatalog.forEach(line => add(parseLine(line, 'Movie')));
    moreMoviesCatalog.forEach(line => add(parseLine(line, 'Movie')));

    return [...seen.values()].sort((a, b) => a.title.localeCompare(b.title) || a.year - b.year);
};

const loadExistingMetadata = () => {
    if (!fs.existsSync(metadataPath)) {
        return { ...animationMetadata };
    }

    const existing = require(metadataPath);
    return { ...existing };
};

const serializeMetadata = (metadata) => {
    const entries = Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b));
    const lines = ['module.exports = {'];

    for (const [title, value] of entries) {
        lines.push(`    ${JSON.stringify(title)}: {`);

        if (value.director) {
            lines.push(`        director: ${JSON.stringify(value.director)},`);
        }

        if (Array.isArray(value.cast) && value.cast.length) {
            lines.push(`        cast: ${JSON.stringify(value.cast)},`);
        }

        if (value.poster) {
            lines.push(`        poster: ${JSON.stringify(value.poster)}`);
        } else if (lines[lines.length - 1].endsWith(',')) {
            lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
        }

        lines.push('    },');
    }

    if (lines[lines.length - 1] === 'module.exports = {') {
        lines.push('};');
        return `${lines.join('\n')}\n`;
    }

    lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
    lines.push('};');
    return `${lines.join('\n')}\n`;
};

const run = async () => {
    const metadata = loadExistingMetadata();
    const entries = collectEntries();
    const pending = entries.filter(entry => {
        const current = metadata[entry.title] || metadata[`${entry.title} ${entry.year}`];
        return !current || !current.poster;
    });

    console.log(`Checking ${entries.length} titles. Missing posters for ${pending.length}.`);

    let updated = 0;
    const concurrency = 6;

    for (let index = 0; index < pending.length; index += concurrency) {
        const batch = pending.slice(index, index + concurrency);
        const results = await Promise.all(batch.map(async (entry) => {
            try {
                const match = await fetchTmdbPoster(entry);
                return { entry, match };
            } catch (err) {
                return { entry, err };
            }
        }));

        for (const result of results) {
            if (result.match && result.match.poster) {
                const existing = metadata[result.entry.title] || metadata[`${result.entry.title} ${result.entry.year}`] || {};
                metadata[result.entry.title] = {
                    ...existing,
                    poster: result.match.poster
                };
                updated += 1;
                console.log(`Poster found: ${result.entry.title} (${result.entry.year})`);
            } else if (result.err) {
                console.log(`Lookup failed: ${result.entry.title} (${result.entry.year}) - ${result.err.message}`);
            } else {
                console.log(`No poster match: ${result.entry.title} (${result.entry.year})`);
            }
        }

        fs.writeFileSync(metadataPath, serializeMetadata(metadata), 'utf8');
        console.log(`Processed ${Math.min(index + concurrency, pending.length)}/${pending.length}`);
    }

    console.log(`Poster metadata updated for ${updated} titles.`);
};

run().catch((err) => {
    console.error('Poster metadata generation failed:', err);
    process.exit(1);
});
