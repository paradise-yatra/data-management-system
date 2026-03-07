import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import { buildReceiptHtml } from './receiptTemplateService.js';
import { loadReceiptFontFaceCss } from './receiptFontService.js';

function getExecutablePath() {
  const explicit = process.env.PDF_CHROMIUM_EXECUTABLE_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  try {
    const detected = puppeteer.executablePath('chrome');
    if (detected && fs.existsSync(detected)) {
      return detected;
    }
  } catch (error) {
    // Fall back to static candidates.
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

  const error = new Error('Chromium executable not found. Set PDF_CHROMIUM_EXECUTABLE_PATH to a valid Chrome binary.');
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
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
    await Promise.race([Promise.allSettled(imagePromises), timeoutPromise]);
  });
}

async function runLayoutValidation(page) {
  return page.evaluate(() => {
    const violations = [];
    const pageBody = document.querySelector('[data-page-body]');
    if (pageBody) {
      const overflowY = pageBody.scrollHeight - pageBody.clientHeight;
      const overflowX = pageBody.scrollWidth - pageBody.clientWidth;
      if (overflowY > 1 || overflowX > 1) {
        violations.push({ type: 'overflow', overflowY, overflowX });
      }
    }

    const footer = document.querySelector('[data-block-type="footer"]');
    const shell = document.querySelector('.receipt-shell');
    if (footer && shell) {
      const footerRect = footer.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      if (footerRect.bottom > shellRect.bottom + 1) {
        violations.push({ type: 'footer_clipped', bottomDelta: footerRect.bottom - shellRect.bottom });
      }
    }

    return {
      hasViolations: violations.length > 0,
      violations,
    };
  });
}

function getLaunchOptions() {
  return {
    executablePath: getExecutablePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--disable-lcd-text'],
  };
}

export async function buildReceiptPreviewHtml(viewModel) {
  const fontFaceCss = await loadReceiptFontFaceCss();
  return buildReceiptHtml(viewModel, { fontFaceCss });
}

export async function renderReceiptDocumentBuffer(viewModel, format = 'PDF') {
  const browser = await puppeteer.launch(getLaunchOptions());
  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 1754, deviceScaleFactor: 2 });
  await page.emulateTimezone(viewModel.timezone || 'Asia/Kolkata');

  try {
    const fontFaceCss = await loadReceiptFontFaceCss();
    const { html, layoutPlan } = buildReceiptHtml(viewModel, { fontFaceCss });
    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });
    await waitForAssets(page);

    const validation = await runLayoutValidation(page);
    if (validation.hasViolations) {
      const error = new Error('RECEIPT_LAYOUT_VALIDATION_FAILED');
      error.code = 'RECEIPT_LAYOUT_VALIDATION_FAILED';
      error.details = validation;
      throw error;
    }

    if (format === 'PDF') {
      const pdfBinary = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      });
      const pdfBuffer = Buffer.from(pdfBinary);
      const pdfDocument = await PDFDocument.load(pdfBuffer);
      return {
        buffer: pdfBuffer,
        pageCount: pdfDocument.getPageCount(),
        widthPx: null,
        heightPx: null,
        layoutPlan,
        renderValidationReport: validation,
        mimeType: 'application/pdf',
        extension: 'pdf',
      };
    }

    await page.addStyleTag({
      content: `
        html, body {
          background: transparent !important;
        }
        .document-root {
          display: inline-block;
        }
        .page {
          min-height: auto !important;
          height: auto !important;
        }
        .notes-section {
          margin-top: 8mm !important;
        }
      `,
    });

    const rootElement = await page.$('.document-root');
    const screenshotType = format === 'JPG' ? 'jpeg' : 'png';
    const imageBinary = await rootElement.screenshot({
      type: screenshotType,
      quality: screenshotType === 'jpeg' ? 95 : undefined,
    });

    return {
      buffer: Buffer.from(imageBinary),
      pageCount: 1,
      widthPx: 1240,
      heightPx: 1754,
      layoutPlan,
      renderValidationReport: validation,
      mimeType: format === 'JPG' ? 'image/jpeg' : 'image/png',
      extension: format === 'JPG' ? 'jpg' : 'png',
    };
  } finally {
    await page.close();
    await browser.close();
  }
}
