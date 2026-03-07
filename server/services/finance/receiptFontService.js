import fs from 'fs/promises';
import path from 'path';

const FONT_CACHE = new Map();

function normalizeBase64(buffer) {
  return buffer.toString('base64');
}

async function loadFontDataUri(fontPath) {
  if (FONT_CACHE.has(fontPath)) {
    return FONT_CACHE.get(fontPath);
  }

  const binary = await fs.readFile(fontPath);
  const dataUri = `data:font/woff2;base64,${normalizeBase64(binary)}`;
  FONT_CACHE.set(fontPath, dataUri);
  return dataUri;
}

export async function loadReceiptFontFaceCss() {
  const root = process.cwd();
  const fontsDir = path.join(root, 'node_modules', '@fontsource', 'plus-jakarta-sans', 'files');

  const weights = [
    { weight: 400, file: 'plus-jakarta-sans-latin-400-normal.woff2' },
    { weight: 500, file: 'plus-jakarta-sans-latin-500-normal.woff2' },
    { weight: 600, file: 'plus-jakarta-sans-latin-600-normal.woff2' },
    { weight: 700, file: 'plus-jakarta-sans-latin-700-normal.woff2' },
    { weight: 800, file: 'plus-jakarta-sans-latin-800-normal.woff2' },
  ];

  const loaded = await Promise.all(
    weights.map(async ({ weight, file }) => {
      const dataUri = await loadFontDataUri(path.join(fontsDir, file));
      return { weight, dataUri };
    })
  );

  return loaded
    .map(
      ({ weight, dataUri }) => `
    @font-face {
      font-family: 'Plus Jakarta Sans';
      src: url('${dataUri}') format('woff2');
      font-weight: ${weight};
      font-style: normal;
      font-display: swap;
    }`
    )
    .join('\n');
}
