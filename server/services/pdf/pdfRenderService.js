import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { buildPdfHtml } from './pdfTemplateService.js';

const FONT_CACHE = new Map();

function normalizeBase64(buffer) {
  return buffer.toString('base64');
}

async function loadFontDataUri(fontPath) {
  if (FONT_CACHE.has(fontPath)) {
    return FONT_CACHE.get(fontPath);
  }
  const binary = await fsPromises.readFile(fontPath);
  const dataUri = `data:font/woff2;base64,${normalizeBase64(binary)}`;
  FONT_CACHE.set(fontPath, dataUri);
  return dataUri;
}

async function buildFontFaceCss() {
  const root = process.cwd();
  const notoRegularPath = path.join(
    root,
    'node_modules',
    '@fontsource',
    'noto-sans',
    'files',
    'noto-sans-latin-400-normal.woff2'
  );
  const notoBoldPath = path.join(
    root,
    'node_modules',
    '@fontsource',
    'noto-sans',
    'files',
    'noto-sans-latin-700-normal.woff2'
  );
  const playfairRegularPath = path.join(
    root,
    'node_modules',
    '@fontsource',
    'playfair-display',
    'files',
    'playfair-display-latin-400-normal.woff2'
  );
  const playfairBoldPath = path.join(
    root,
    'node_modules',
    '@fontsource',
    'playfair-display',
    'files',
    'playfair-display-latin-700-normal.woff2'
  );

  const [notoRegular, notoBold, playfairRegular, playfairBold] = await Promise.all([
    loadFontDataUri(notoRegularPath),
    loadFontDataUri(notoBoldPath),
    loadFontDataUri(playfairRegularPath),
    loadFontDataUri(playfairBoldPath),
  ]);

  return `
    @font-face {
      font-family: 'Noto Sans';
      src: url('${notoRegular}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Noto Sans';
      src: url('${notoBold}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url('${playfairRegular}') format('woff2');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    @font-face {
      font-family: 'Playfair Display';
      src: url('${playfairBold}') format('woff2');
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }
  `;
}

function getExecutablePath() {
  const explicit = process.env.PDF_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  try {
    const detected = puppeteer.executablePath('chrome');
    if (detected && fs.existsSync(detected)) return detected;
  } catch (error) {
    // Fallback to static candidates below.
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  const detectedPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (detectedPath) {
    return detectedPath;
  }

  const error = new Error(
    'Chromium executable not found. Set PDF_CHROMIUM_EXECUTABLE_PATH to a valid Chrome binary.'
  );
  error.code = 'CHROMIUM_NOT_FOUND';
  throw error;
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const imagePromises = Array.from(document.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const finish = () => resolve();
        img.addEventListener('load', finish, { once: true });
        img.addEventListener('error', finish, { once: true });
      });
    });

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(resolve, 3000);
    });

    await Promise.race([Promise.allSettled(imagePromises), timeoutPromise]);
  });
}

async function runLayoutValidation(page) {
  return page.evaluate(() => {
    const overflowViolations = [];
    const overlapViolations = [];
    const orphanHeadingViolations = [];

    const pageBodies = Array.from(document.querySelectorAll('[data-page-body]'));
    pageBodies.forEach((body, bodyIndex) => {
      const overflowY = body.scrollHeight - body.clientHeight;
      const overflowX = body.scrollWidth - body.clientWidth;
      if (overflowY > 1 || overflowX > 1) {
        overflowViolations.push({
          pageBodyIndex: bodyIndex,
          overflowY,
          overflowX,
        });
      }

      const blocks = Array.from(body.querySelectorAll('[data-layout-block]'));
      const rects = blocks.map((element, index) => ({
        index,
        type: element.getAttribute('data-block-type') || 'unknown',
        rect: element.getBoundingClientRect(),
      }));

      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          const a = rects[i].rect;
          const b = rects[j].rect;
          const overlaps = a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          if (overlaps) {
            overlapViolations.push({
              pageBodyIndex: bodyIndex,
              aIndex: rects[i].index,
              bIndex: rects[j].index,
              aType: rects[i].type,
              bType: rects[j].type,
            });
          }
        }
      }

      const headings = Array.from(body.querySelectorAll('.section-heading'));
      const bodyRect = body.getBoundingClientRect();
      headings.forEach((heading) => {
        const headingRect = heading.getBoundingClientRect();
        const spaceBelow = bodyRect.bottom - headingRect.bottom;
        if (spaceBelow < 18) {
          orphanHeadingViolations.push({
            pageBodyIndex: bodyIndex,
            heading: heading.textContent?.trim() || '',
            spaceBelow,
          });
        }
      });
    });

    return {
      hasViolations:
        overflowViolations.length > 0 ||
        overlapViolations.length > 0 ||
        orphanHeadingViolations.length > 0,
      overflowViolations,
      overlapViolations,
      orphanHeadingViolations,
    };
  });
}

async function renderAttempt(page, viewModel, attemptConfig) {
  const fontFaceCss = await buildFontFaceCss();
  const { html, layoutPlan } = buildPdfHtml(viewModel, {
    ...attemptConfig,
    fontFaceCss,
  });

  await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });
  await waitForAssets(page);
  const report = await runLayoutValidation(page);

  if (report.hasViolations) {
    return {
      status: 'FAILED_VALIDATION',
      report,
      layoutPlan,
      html,
    };
  }

  const pdfBinary = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
  });

  const pdfBuffer = Buffer.from(pdfBinary);
  const pdfDocument = await PDFDocument.load(pdfBuffer);

  return {
    status: 'SUCCESS',
    report,
    layoutPlan,
    html,
    pdfBuffer,
    pageCount: pdfDocument.getPageCount(),
  };
}

function getLaunchOptions() {
  return {
    executablePath: getExecutablePath(),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none',
      '--disable-lcd-text',
    ],
  };
}

export async function renderItineraryPdfBuffer(viewModel) {
  const browser = await puppeteer.launch(getLaunchOptions());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1810, deviceScaleFactor: 1 });
  await page.emulateTimezone(viewModel.timezone || 'Asia/Kolkata');

  const attempts = [
    { pass: 1, maxEventsPerCard: 6, maxDescriptionChars: 220 },
    { pass: 2, maxEventsPerCard: 4, maxDescriptionChars: 170 },
  ];

  try {
    let finalFailure = null;
    for (const attempt of attempts) {
      const result = await renderAttempt(page, viewModel, attempt);
      if (result.status === 'SUCCESS') {
        return {
          pdfBuffer: result.pdfBuffer,
          pageCount: result.pageCount,
          layoutPlan: result.layoutPlan,
          renderValidationReport: {
            ...result.report,
            pass: attempt.pass,
          },
          html: result.html,
          passUsed: attempt.pass,
        };
      }
      finalFailure = {
        attempt,
        layoutPlan: result.layoutPlan,
        report: result.report,
      };
    }

    const error = new Error('PDF_LAYOUT_VALIDATION_FAILED');
    error.code = 'PDF_LAYOUT_VALIDATION_FAILED';
    error.details = finalFailure;
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }
}
