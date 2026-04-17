const paletteByLibrary = {
    Hollywood: { top: '#111827', bottom: '#1f2937', accent: '#f59e0b' },
    Bollywood: { top: '#7c2d12', bottom: '#431407', accent: '#fb7185' },
    Tollywood: { top: '#052e16', bottom: '#14532d', accent: '#facc15' },
    'South Indian': { top: '#172554', bottom: '#1e3a8a', accent: '#38bdf8' },
    Korean: { top: '#831843', bottom: '#4a044e', accent: '#f9a8d4' },
    International: { top: '#0f766e', bottom: '#134e4a', accent: '#99f6e4' },
    Indian: { top: '#1d4ed8', bottom: '#1e3a8a', accent: '#93c5fd' }
};

const escapeXml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toDataUri = (svg) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const initialsFromName = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CV';
    return parts.slice(0, 2).map(part => part[0].toUpperCase()).join('');
};

const createPosterDataUri = ({ title = 'CineVerse', library = 'Hollywood', type = 'Movie', year = '' } = {}) => {
    const palette = paletteByLibrary[library] || paletteByLibrary.Hollywood;
    const safeTitle = escapeXml(title);
    const safeLibrary = escapeXml(library.toUpperCase());
    const safeType = escapeXml(type.toUpperCase());
    const safeYear = escapeXml(year ? String(year) : '');

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 750" role="img" aria-label="${safeTitle}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.top}"/>
      <stop offset="100%" stop-color="${palette.bottom}"/>
    </linearGradient>
  </defs>
  <rect width="500" height="750" rx="36" fill="url(#bg)"/>
  <circle cx="410" cy="110" r="78" fill="${palette.accent}" fill-opacity="0.16"/>
  <circle cx="110" cy="635" r="92" fill="${palette.accent}" fill-opacity="0.1"/>
  <rect x="34" y="34" width="432" height="682" rx="26" fill="none" stroke="rgba(255,255,255,0.12)"/>
  <text x="46" y="84" fill="#f8fafc" font-size="20" font-family="Arial, Helvetica, sans-serif" letter-spacing="5">CINEVERSE</text>
  <text x="46" y="128" fill="${palette.accent}" font-size="22" font-family="Arial, Helvetica, sans-serif" letter-spacing="3">${safeLibrary}</text>
  <text x="46" y="158" fill="#cbd5e1" font-size="18" font-family="Arial, Helvetica, sans-serif" letter-spacing="3">${safeType}${safeYear ? ' • ' + safeYear : ''}</text>
  <foreignObject x="46" y="210" width="408" height="320">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#ffffff;font-family:Arial, Helvetica, sans-serif;font-size:46px;font-weight:800;line-height:1.05;display:flex;align-items:flex-start;justify-content:flex-start;height:100%;word-break:break-word;">
      ${safeTitle}
    </div>
  </foreignObject>
  <text x="46" y="664" fill="#e5e7eb" font-size="18" font-family="Arial, Helvetica, sans-serif" letter-spacing="4">WATCH NEXT</text>
</svg>`;

    return toDataUri(svg);
};

const createAvatarDataUri = (name = 'CineVerse User') => {
    const initials = escapeXml(initialsFromName(name));
    const safeName = escapeXml(name);
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${safeName}">
  <defs>
    <linearGradient id="avatarBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="100%" stop-color="#374151"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="128" fill="url(#avatarBg)"/>
  <circle cx="128" cy="128" r="104" fill="none" stroke="rgba(255,255,255,0.14)"/>
  <text x="128" y="146" text-anchor="middle" fill="#f8fafc" font-size="82" font-weight="800" font-family="Arial, Helvetica, sans-serif">${initials}</text>
</svg>`;

    return toDataUri(svg);
};

module.exports = {
    createPosterDataUri,
    createAvatarDataUri
};
