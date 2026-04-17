const TMDB_BASE_URL = 'https://www.themoviedb.org';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value = '') => String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const slugifyTitle = (value = '') => normalizeText(value).replace(/\s+/g, '-');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const buildOriginalImageUrl = (value = '') => {
    const match = String(value).match(/\/t\/p\/[^/]+(\/[^?"']+)/i);
    return match ? `${TMDB_IMAGE_BASE_URL}${match[1]}` : '';
};

const fetchHtml = async (url, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            const response = await fetch(url, {
                headers: {
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
                    'accept-language': 'en-US,en;q=0.9'
                }
            });

            if (!response.ok) {
                throw new Error(`TMDb request failed with status ${response.status}`);
            }

            return await response.text();
        } catch (err) {
            if (attempt === retries) {
                throw err;
            }
            await sleep(400 * (attempt + 1));
        }
    }

    return '';
};

const extractMetaContent = (html = '', property) => {
    const pattern = new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i');
    const match = html.match(pattern);
    return match ? match[1] : '';
};

const extractTitleAndYear = (html = '') => {
    const title = extractMetaContent(html, 'og:title');
    const match = title.match(/^(.*?)(?:\s+\((\d{4})\))?$/);
    return {
        title: match ? match[1].trim() : title.trim(),
        year: match && match[2] ? Number(match[2]) : null
    };
};

const scoreCandidate = ({ movie, candidateTitle, candidateYear, candidateUrl }) => {
    const movieTitle = normalizeText(movie.title);
    const titleScore = movieTitle === normalizeText(candidateTitle) ? 4 : (
        normalizeText(candidateTitle).includes(movieTitle) || movieTitle.includes(normalizeText(candidateTitle)) ? 2 : 0
    );
    const yearScore = movie.year && candidateYear ? (movie.year === candidateYear ? 3 : Math.abs(movie.year - candidateYear) <= 1 ? 1 : -2) : 0;
    const slugScore = candidateUrl.includes(slugifyTitle(movie.title)) ? 1 : 0;
    return titleScore + yearScore + slugScore;
};

const buildDirectCandidateUrls = (movie = {}) => {
    const mediaType = movie.type === 'TV Series' ? 'tv' : 'movie';
    return [
        `${TMDB_BASE_URL}/search/${mediaType}?query=${encodeURIComponent(movie.title)}`,
        `${TMDB_BASE_URL}/search?query=${encodeURIComponent(movie.title)}`
    ];
};

const extractSearchCandidates = (html = '', expectedType) => {
    const cardRegex = /href="\/(movie|tv)\/[^"]+"[\s\S]{0,1400}?<img[^>]+alt="([^"]+)"[^>]+src="([^"]+)"[\s\S]{0,900}?<span class="release_date[^"]*">([^<]+)<\/span>/gi;
    const matches = [];
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
        const [, mediaType, title, imageUrl, releaseDate] = match;
        const yearMatch = String(releaseDate).match(/\b(\d{4})\b/);

        matches.push({
            mediaType,
            title: title.trim(),
            year: yearMatch ? Number(yearMatch[1]) : null,
            poster: buildOriginalImageUrl(imageUrl)
        });
    }

    return matches
        .filter(item => item.mediaType === expectedType && item.poster)
        .slice(0, 10);
};

const fetchTmdbPoster = async (movie = {}) => {
    const expectedType = movie.type === 'TV Series' ? 'tv' : 'movie';

    for (const url of buildDirectCandidateUrls(movie)) {
        try {
            const html = await fetchHtml(url, 1);
            const candidates = extractSearchCandidates(html, expectedType);

            for (const candidate of candidates) {
                const score = scoreCandidate({
                    movie,
                    candidateTitle: candidate.title,
                    candidateYear: candidate.year,
                    candidateUrl: url
                });

                if (score >= 4) {
                    return {
                        poster: candidate.poster,
                        sourceUrl: url,
                        title: candidate.title,
                        year: candidate.year
                    };
                }
            }
        } catch (err) {
            continue;
        }
    }

    return null;
};

const isTmdbImageUrl = (value = '') => String(value).startsWith(TMDB_IMAGE_BASE_URL);

module.exports = {
    fetchTmdbPoster,
    isTmdbImageUrl
};
