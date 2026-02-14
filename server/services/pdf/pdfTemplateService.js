import { escapeHtml, formatCurrency, formatDurationMinutes, truncateText } from './pdfFormatters.js';

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 10;
const PAGE_HEADER_MM = 18;
const PAGE_BODY_MAX_MM = PAGE_HEIGHT_MM - PAGE_PADDING_MM * 2 - PAGE_HEADER_MM;

function normalizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return trimmed;
}

function createDayBlocks(daySection, options) {
  const maxEventsPerCard = Math.max(1, Number(options.maxEventsPerCard || 6));
  const maxDescriptionChars = Math.max(80, Number(options.maxDescriptionChars || 220));
  const blocks = [];

  const events = Array.isArray(daySection.events) ? daySection.events : [];
  if (events.length === 0) {
    blocks.push({
      type: 'day',
      dayNumber: daySection.dayNumber,
      estimatedHeightMm: 38,
      payload: {
        ...daySection,
        events: [],
        continuationLabel: '',
      },
    });
    return blocks;
  }

  for (let start = 0; start < events.length; start += maxEventsPerCard) {
    const end = start + maxEventsPerCard;
    const chunk = events.slice(start, end).map((event) => ({
      ...event,
      description: truncateText(event.description, maxDescriptionChars),
    }));
    blocks.push({
      type: 'day',
      dayNumber: daySection.dayNumber,
      estimatedHeightMm: 28 + chunk.length * 18,
      payload: {
        ...daySection,
        events: chunk,
        continuationLabel: start > 0 ? '(Continued)' : '',
      },
    });
  }

  return blocks;
}

function createStaticBlocks(viewModel) {
  const notesCount = viewModel.notes?.length || 0;
  const termsCount = viewModel.terms?.length || 0;
  return [
    {
      type: 'summary',
      estimatedHeightMm: 52,
      payload: viewModel.summary,
    },
    ...viewModel.daySections.flatMap((daySection) => createDayBlocks(daySection, viewModel.layoutConfig)),
    {
      type: 'pricing',
      estimatedHeightMm: 65,
      payload: viewModel.pricing,
    },
    {
      type: 'lists',
      estimatedHeightMm: Math.max(48, 34 + Math.max(3, notesCount) * 5 + Math.max(2, termsCount) * 5),
      payload: {
        inclusions: viewModel.inclusions || [],
        exclusions: viewModel.exclusions || [],
        notes: viewModel.notes || [],
        terms: viewModel.terms || [],
      },
    },
  ];
}

function paginateBlocks(blocks) {
  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  for (const block of blocks) {
    const blockHeight = Number(block.estimatedHeightMm || 0);
    if (currentPage.length > 0 && currentHeight + blockHeight > PAGE_BODY_MAX_MM) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }
    currentPage.push(block);
    currentHeight += blockHeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function renderSummaryBlock(viewModel, block) {
  const summary = block.payload || {};
  return `
    <section class="section-card" data-layout-block data-block-type="summary">
      <h2 class="section-heading">Trip Summary</h2>
      <div class="summary-grid">
        <article class="metric-card">
          <span class="metric-label">Total Days</span>
          <strong class="metric-value">${escapeHtml(summary.totalDays || 0)}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-label">Stops Planned</span>
          <strong class="metric-value">${escapeHtml(summary.totalEvents || 0)}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-label">Total Route</span>
          <strong class="metric-value">${escapeHtml(summary.totalDistanceLabel || '0 km')}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-label">Travel Time</span>
          <strong class="metric-value">${escapeHtml(summary.totalTravelLabel || '0 min')}</strong>
        </article>
      </div>
      <div class="summary-meta">
        <span>Trip Window: ${escapeHtml(viewModel.tripPeriod.startDateLabel)} to ${escapeHtml(
          viewModel.tripPeriod.endDateLabel
        )}</span>
        <span>Generated: ${escapeHtml(viewModel.generatedAtLabel)}</span>
      </div>
    </section>
  `;
}

function renderDayBlock(viewModel, block) {
  const day = block.payload || {};
  const eventMarkup = (day.events || [])
    .map((event) => {
      const imageUrl = normalizeUrl(event.imageUrl);
      const routeMeta = `${Number(event.distanceKm || 0).toFixed(1)} km | ${formatDurationMinutes(
        event.travelTimeMin || 0
      )} | ${event.routeProvider || 'STATIC'}`;
      const validationClass = event.validationStatus === 'INVALID' ? 'event-invalid' : '';
      const imageMarkup = imageUrl
        ? `<img class="event-image" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(event.placeName)}" />`
        : `<div class="event-image event-image-placeholder">${escapeHtml(
            String(event.category || '').slice(0, 3)
          )}</div>`;

      return `
        <article class="event-row ${validationClass}">
          ${imageMarkup}
          <div class="event-main">
            <div class="event-title-row">
              <strong class="event-title clamp-2">${escapeHtml(event.placeName)}</strong>
              <span class="event-chip">${escapeHtml(event.category)}</span>
            </div>
            <p class="event-description clamp-2">${escapeHtml(event.description || '')}</p>
            ${
              event.validationStatus === 'INVALID'
                ? `<p class="event-warning">Validation: ${escapeHtml(
                    event.validationReason || 'Schedule conflict'
                  )}</p>`
                : ''
            }
          </div>
          <div class="event-side">
            <p class="time-range">${escapeHtml(event.startTime)} - ${escapeHtml(event.endTime)}</p>
            <p class="route-meta">${escapeHtml(routeMeta)}</p>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <section class="section-card" data-layout-block data-block-type="day">
      <h2 class="section-heading">
        Day ${escapeHtml(day.dayNumber || 1)} - ${escapeHtml(day.dateLabel || '')}
        <span class="section-heading-sub">${escapeHtml(day.continuationLabel || '')}</span>
      </h2>
      <div class="events-list">
        ${eventMarkup || '<p class="muted-note">No itinerary events added for this day.</p>'}
      </div>
      <div class="day-summary-strip">
        <span>Stops: ${escapeHtml(day.summary?.eventCount || 0)}</span>
        <span>Distance: ${escapeHtml(Number(day.summary?.dayDistanceKm || 0).toFixed(1))} km</span>
        <span>Transit: ${escapeHtml(formatDurationMinutes(day.summary?.dayTravelTimeMin || 0))}</span>
      </div>
    </section>
  `;
}

function renderPricingBlock(viewModel, block) {
  const pricing = block.payload || {};
  const rows = (pricing.lineItems || [])
    .map((line) => {
      const amountLabel =
        line.amount < 0
          ? `- ${formatCurrency(Math.abs(line.amount), viewModel.currencyCode, viewModel.locale)}`
          : formatCurrency(line.amount, viewModel.currencyCode, viewModel.locale);
      return `
        <div class="price-row">
          <span>${escapeHtml(line.label)}</span>
          <strong>${escapeHtml(amountLabel)}</strong>
        </div>
      `;
    })
    .join('');

  return `
    <section class="section-card" data-layout-block data-block-type="pricing">
      <h2 class="section-heading">Pricing Breakdown</h2>
      <div class="pricing-grid">
        <div class="pricing-rows">
          ${rows}
        </div>
        <aside class="pricing-total">
          <span>Final Amount</span>
          <strong>${escapeHtml(pricing.summary?.totalFormatted || formatCurrency(0, viewModel.currencyCode, viewModel.locale))}</strong>
          <p>
            Includes GST (${escapeHtml(pricing.summary?.gstPercent || 0)}%) after discount.
          </p>
        </aside>
      </div>
    </section>
  `;
}

function renderListColumn(title, items) {
  const listMarkup = (items || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join('');
  return `
    <article class="list-card">
      <h3>${escapeHtml(title)}</h3>
      <ul>${listMarkup || '<li>Not specified</li>'}</ul>
    </article>
  `;
}

function renderListsBlock(viewModel, block) {
  const payload = block.payload || {};
  return `
    <section class="section-card" data-layout-block data-block-type="lists">
      <h2 class="section-heading">Inclusions, Notes and Terms</h2>
      <div class="list-grid">
        ${renderListColumn('Inclusions', payload.inclusions)}
        ${renderListColumn('Exclusions', payload.exclusions)}
      </div>
      <div class="list-grid notes-grid">
        ${renderListColumn('Operational Notes', payload.notes)}
        ${renderListColumn('Terms', payload.terms)}
      </div>
    </section>
  `;
}

function renderPageBody(viewModel, blocks) {
  return blocks
    .map((block) => {
      if (block.type === 'summary') return renderSummaryBlock(viewModel, block);
      if (block.type === 'day') return renderDayBlock(viewModel, block);
      if (block.type === 'pricing') return renderPricingBlock(viewModel, block);
      if (block.type === 'lists') return renderListsBlock(viewModel, block);
      return '';
    })
    .join('');
}

function renderCoverPage(viewModel) {
  const traveler = viewModel.traveler || {};
  return `
    <section class="pdf-page cover-page" data-page-index="0">
      <div class="cover-backdrop"></div>
      <div class="cover-content">
        <p class="cover-kicker">LogicTravel Pro</p>
        <h1>${escapeHtml(viewModel.tripName)}</h1>
        <p class="cover-subtitle">Deterministic itinerary plan crafted with schedule and route validation.</p>
        <div class="cover-meta-grid">
          <article>
            <span>Travel Dates</span>
            <strong>${escapeHtml(viewModel.tripPeriod.startDateLabel)} - ${escapeHtml(
              viewModel.tripPeriod.endDateLabel
            )}</strong>
          </article>
          <article>
            <span>Primary Traveler</span>
            <strong>${escapeHtml(traveler.leadName || 'To be confirmed')}</strong>
          </article>
          <article>
            <span>Total Travelers</span>
            <strong>${escapeHtml(
              (Number(traveler.adults || 0) + Number(traveler.children || 0) + Number(traveler.infants || 0))
                .toString()
            )}</strong>
          </article>
        </div>
        <div class="cover-agency">${escapeHtml(viewModel.agency?.name || 'Paradise Yatra')}</div>
      </div>
    </section>
  `;
}

function renderDataPages(viewModel, pageBlocks) {
  return pageBlocks
    .map((blocks, pageIndex) => {
      const indexLabel = pageIndex + 2;
      return `
        <section class="pdf-page data-page" data-page-index="${indexLabel}">
          <header class="page-header">
            <div>
              <p class="page-eyebrow">Itinerary Dossier</p>
              <h2>${escapeHtml(viewModel.tripName)}</h2>
            </div>
            <div class="page-header-meta">
              <span>${escapeHtml(viewModel.tripPeriod.startDateLabel)} - ${escapeHtml(
                viewModel.tripPeriod.endDateLabel
              )}</span>
              <span>Page ${indexLabel}</span>
            </div>
          </header>
          <div class="page-body" data-page-body>
            ${renderPageBody(viewModel, blocks)}
          </div>
          <footer class="page-footer">
            <span>${escapeHtml(viewModel.agency?.name || 'Paradise Yatra')}</span>
            <span>${escapeHtml(viewModel.agency?.phone || viewModel.agency?.email || '')}</span>
          </footer>
        </section>
      `;
    })
    .join('');
}

function buildStyles(fontFaceCss = '') {
  return `
    ${fontFaceCss}
    :root {
      --page-width-mm: ${PAGE_WIDTH_MM}mm;
      --page-height-mm: ${PAGE_HEIGHT_MM}mm;
      --page-padding-mm: ${PAGE_PADDING_MM}mm;
      --header-height-mm: ${PAGE_HEADER_MM}mm;
      --body-height-mm: ${PAGE_BODY_MAX_MM}mm;
      --bg: #f4f6f9;
      --ink: #0f1f2f;
      --muted: #5c6a79;
      --line: #d7dfe8;
      --card: #ffffff;
      --accent: #0f766e;
      --accent-2: #c2410c;
      --danger: #b91c1c;
      --cover-grad-a: #0b132b;
      --cover-grad-b: #1f3a5f;
      --font-heading: 'Playfair Display', Georgia, serif;
      --font-body: 'Noto Sans', 'Segoe UI', Arial, sans-serif;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: var(--font-body);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    .document-root {
      width: var(--page-width-mm);
      margin: 0 auto;
    }
    .pdf-page {
      width: var(--page-width-mm);
      height: var(--page-height-mm);
      padding: var(--page-padding-mm);
      position: relative;
      overflow: hidden;
      page-break-after: always;
      background: #fff;
    }
    .pdf-page:last-child {
      page-break-after: auto;
    }
    .cover-page {
      color: #fff;
      display: flex;
      align-items: stretch;
      justify-content: stretch;
    }
    .cover-backdrop {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at top right, #2b4d79 0%, transparent 48%),
        linear-gradient(140deg, var(--cover-grad-a) 0%, var(--cover-grad-b) 100%);
    }
    .cover-content {
      position: relative;
      z-index: 2;
      width: 100%;
      border: 0.3mm solid rgba(255, 255, 255, 0.34);
      border-radius: 4mm;
      padding: 12mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8mm;
    }
    .cover-kicker {
      letter-spacing: 0.32mm;
      text-transform: uppercase;
      font-size: 3.4mm;
      margin: 0;
      color: rgba(255, 255, 255, 0.78);
    }
    .cover-content h1 {
      margin: 0;
      font-family: var(--font-heading);
      font-size: 12mm;
      line-height: 1.06;
      max-width: 160mm;
    }
    .cover-subtitle {
      margin: 0;
      max-width: 150mm;
      color: rgba(255, 255, 255, 0.85);
      font-size: 4mm;
      line-height: 1.45;
    }
    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3mm;
    }
    .cover-meta-grid article {
      border: 0.2mm solid rgba(255, 255, 255, 0.24);
      border-radius: 2mm;
      padding: 2.4mm 2.8mm;
      background: rgba(255, 255, 255, 0.05);
    }
    .cover-meta-grid span {
      display: block;
      font-size: 2.8mm;
      color: rgba(255, 255, 255, 0.78);
      margin-bottom: 1mm;
    }
    .cover-meta-grid strong {
      display: block;
      font-size: 3.4mm;
      line-height: 1.35;
    }
    .cover-agency {
      font-size: 3.2mm;
      letter-spacing: 0.2mm;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.84);
    }
    .data-page {
      background: #fbfcfd;
    }
    .page-header {
      height: var(--header-height-mm);
      border-bottom: 0.25mm solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 2.5mm;
      gap: 4mm;
    }
    .page-eyebrow {
      margin: 0;
      font-size: 2.8mm;
      letter-spacing: 0.2mm;
      text-transform: uppercase;
      color: var(--muted);
    }
    .page-header h2 {
      margin: 0.8mm 0 0;
      font-family: var(--font-heading);
      font-size: 5.4mm;
      line-height: 1.1;
      max-width: 130mm;
    }
    .page-header-meta {
      text-align: right;
      font-size: 2.8mm;
      line-height: 1.45;
      color: var(--muted);
    }
    .page-header-meta span {
      display: block;
    }
    .page-body {
      height: var(--body-height-mm);
      padding-top: 3mm;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 2.6mm;
    }
    .page-footer {
      position: absolute;
      left: var(--page-padding-mm);
      right: var(--page-padding-mm);
      bottom: 5mm;
      border-top: 0.2mm solid var(--line);
      padding-top: 1.6mm;
      color: var(--muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 2.8mm;
    }
    .section-card {
      background: var(--card);
      border: 0.22mm solid var(--line);
      border-radius: 2.4mm;
      padding: 2.7mm;
      break-inside: avoid;
    }
    .section-heading {
      font-family: var(--font-heading);
      margin: 0 0 2.2mm;
      font-size: 4.5mm;
      color: #10253e;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 2mm;
    }
    .section-heading-sub {
      font-size: 2.8mm;
      color: var(--muted);
      font-family: var(--font-body);
      font-weight: 500;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2mm;
    }
    .metric-card {
      border: 0.2mm solid var(--line);
      border-radius: 2mm;
      padding: 2.2mm;
      background: #f8fafc;
    }
    .metric-label {
      display: block;
      font-size: 2.6mm;
      color: var(--muted);
      margin-bottom: 1mm;
    }
    .metric-value {
      font-size: 4.1mm;
      line-height: 1.2;
    }
    .summary-meta {
      margin-top: 2.2mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2mm;
      color: var(--muted);
      font-size: 2.8mm;
    }
    .events-list {
      display: flex;
      flex-direction: column;
      gap: 1.6mm;
    }
    .event-row {
      border: 0.2mm solid var(--line);
      border-radius: 2mm;
      display: grid;
      grid-template-columns: 23mm 1fr 33mm;
      gap: 2.2mm;
      padding: 1.7mm;
      background: #fff;
      min-height: 17mm;
      align-items: center;
    }
    .event-invalid {
      border-color: #f1b5b5;
      background: #fff6f6;
    }
    .event-image {
      width: 100%;
      height: 13.2mm;
      border-radius: 1.3mm;
      object-fit: cover;
      background: #dde4ed;
      border: 0.2mm solid #cad2dd;
    }
    .event-image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1e293b;
      font-weight: 700;
      letter-spacing: 0.16mm;
      font-size: 3.2mm;
    }
    .event-main {
      min-width: 0;
    }
    .event-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2mm;
      margin-bottom: 0.9mm;
    }
    .event-title {
      font-size: 3.3mm;
      line-height: 1.25;
      max-width: 78mm;
    }
    .event-chip {
      flex: none;
      font-size: 2.35mm;
      letter-spacing: 0.1mm;
      text-transform: uppercase;
      background: #0f766e12;
      color: #0f766e;
      border: 0.2mm solid #0f766e3d;
      border-radius: 99mm;
      padding: 0.45mm 1.5mm;
      font-weight: 700;
    }
    .event-description {
      margin: 0;
      color: #506071;
      font-size: 2.6mm;
      line-height: 1.33;
    }
    .event-warning {
      margin: 1mm 0 0;
      color: var(--danger);
      font-size: 2.45mm;
      line-height: 1.25;
      font-weight: 600;
    }
    .event-side {
      text-align: right;
      font-size: 2.45mm;
      color: #4a5a6e;
      line-height: 1.35;
    }
    .time-range {
      margin: 0;
      font-weight: 700;
      color: #0f1f2f;
      font-size: 2.7mm;
    }
    .route-meta {
      margin: 1mm 0 0;
    }
    .day-summary-strip {
      margin-top: 1.7mm;
      border-top: 0.2mm dashed var(--line);
      padding-top: 1.7mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #495a70;
      font-size: 2.7mm;
      gap: 2mm;
    }
    .pricing-grid {
      display: grid;
      grid-template-columns: 1fr 44mm;
      gap: 2mm;
    }
    .pricing-rows {
      border: 0.2mm solid var(--line);
      border-radius: 2mm;
      padding: 1mm 2mm;
      background: #fbfcfe;
    }
    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2mm;
      padding: 1.1mm 0;
      border-bottom: 0.15mm dashed #d8e0ea;
      font-size: 2.8mm;
    }
    .price-row:last-child {
      border-bottom: 0;
    }
    .pricing-total {
      background: linear-gradient(150deg, #0f766e 0%, #115e59 100%);
      color: #fff;
      border-radius: 2mm;
      padding: 3mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.2mm;
      min-height: 34mm;
    }
    .pricing-total span {
      font-size: 2.8mm;
      opacity: 0.9;
    }
    .pricing-total strong {
      font-size: 5mm;
      line-height: 1;
      font-family: var(--font-heading);
    }
    .pricing-total p {
      margin: 0;
      font-size: 2.4mm;
      line-height: 1.35;
      opacity: 0.9;
    }
    .list-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2mm;
      margin-bottom: 2mm;
    }
    .notes-grid {
      margin-bottom: 0;
    }
    .list-card {
      border: 0.2mm solid var(--line);
      border-radius: 2mm;
      padding: 2mm;
      background: #fbfcff;
      min-height: 26mm;
    }
    .list-card h3 {
      margin: 0 0 1.2mm;
      font-size: 3.2mm;
      color: #16304d;
    }
    .list-card ul {
      margin: 0;
      padding-left: 3.6mm;
      font-size: 2.6mm;
      line-height: 1.42;
      color: #485971;
    }
    .list-card li {
      margin: 0.4mm 0;
    }
    .muted-note {
      margin: 0;
      color: var(--muted);
      font-size: 2.7mm;
    }
    .clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `;
}

export function buildPdfHtml(viewModel, options = {}) {
  const layoutConfig = {
    maxEventsPerCard: Number(options.maxEventsPerCard || 6),
    maxDescriptionChars: Number(options.maxDescriptionChars || 220),
  };
  const templateInput = {
    ...viewModel,
    layoutConfig,
  };

  const blocks = createStaticBlocks(templateInput);
  const pages = paginateBlocks(blocks);

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(viewModel.tripName)} - Itinerary</title>
        <style>${buildStyles(options.fontFaceCss || '')}</style>
      </head>
      <body>
        <main class="document-root">
          ${renderCoverPage(templateInput)}
          ${renderDataPages(templateInput, pages)}
        </main>
      </body>
    </html>
  `;

  return {
    html,
    pageCountEstimate: pages.length + 1,
    layoutPlan: {
      pageCount: pages.length + 1,
      pageBodyCapacityMm: PAGE_BODY_MAX_MM,
      appliedConfig: layoutConfig,
      blockCount: blocks.length,
    },
  };
}
