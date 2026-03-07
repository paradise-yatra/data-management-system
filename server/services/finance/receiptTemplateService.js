import { escapeHtml } from './receiptFormatters.js';

function normalizeUrl(url) {
  return typeof url === 'string' && url.trim() ? url.trim() : '';
}

function buildStyles(fontFaceCss = '') {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    ${fontFaceCss}
    :root {
      --page-width-mm: 210mm;
      --page-height-mm: 297mm;
      --page-padding: 14mm;
      --ink: #000945;
      --muted: #6b7280;
      --light-muted: #9ca3af;
      --border: #e5e7eb;
      --soft-bg: #f8fafc;
      --paper: #ffffff;
      --green: #16a34a;
      --green-bg: #dcfce7;
      --green-border: #bbf7d0;
      --brand-primary: var(--brand-primary-color, #000945);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #f1f5f9;
      color: var(--ink);
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { size: A4 portrait; margin: 0; }

    .page {
      width: var(--page-width-mm);
      min-height: var(--page-height-mm);
      margin: 0 auto;
      background: var(--paper);
      padding: var(--page-padding);
      position: relative;
      display: flex;
      flex-direction: column;
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10mm;
      border-bottom: 0.3mm solid var(--border);
    }
    .header-left h1 {
      font-size: 28pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--ink);
      line-height: 1;
      margin-bottom: 3mm;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 1.5mm 4mm;
      border-radius: 99px;
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: capitalize;
    }
    .status-badge.paid,
    .status-badge.issued {
      background: var(--green-bg);
      color: var(--green);
    }
    .status-badge.void {
      background: #fee2e2;
      color: #dc2626;
    }
    .header-right {
      text-align: right;
    }
    .header-right .company-name {
      font-size: 14pt;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.2;
    }
    .header-right .company-details {
      font-size: 8pt;
      color: var(--muted);
      line-height: 1.6;
      margin-top: 1.5mm;
    }

    /* ── BILL TO / RECEIPT INFO ── */
    .bill-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 8mm 0;
    }
    .bill-to .label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--muted);
      margin-bottom: 2mm;
    }
    .bill-to .name {
      font-size: 13pt;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.2;
    }
    .bill-to .contact {
      font-size: 8.5pt;
      color: var(--muted);
      margin-top: 1mm;
      line-height: 1.5;
    }
    .receipt-info {
      text-align: right;
    }
    .receipt-info .info-row {
      font-size: 9pt;
      color: var(--muted);
      line-height: 2;
    }
    .receipt-info .info-row strong {
      color: var(--ink);
      font-weight: 600;
    }

    /* ── TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4mm;
    }
    .items-table thead th {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      color: var(--muted);
      padding: 3mm 2mm;
      border-bottom: 0.4mm solid var(--border);
      text-align: left;
    }
    .items-table thead th:last-child,
    .items-table thead th:nth-child(2),
    .items-table thead th:nth-child(3) {
      text-align: right;
    }
    .items-table tbody td {
      font-size: 9pt;
      padding: 3.5mm 2mm;
      border-bottom: 0.2mm solid var(--border);
      color: var(--ink);
    }
    .items-table tbody td:last-child,
    .items-table tbody td:nth-child(2),
    .items-table tbody td:nth-child(3) {
      text-align: right;
      font-weight: 500;
    }
    .items-table tbody td .item-sub {
      display: block;
      font-size: 7.5pt;
      color: var(--light-muted);
      margin-top: 0.5mm;
    }

    /* ── TOTALS ── */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 5mm;
    }
    .totals-table {
      width: 55%;
      border-collapse: collapse;
    }
    .totals-table tr td {
      padding: 2.5mm 2mm;
      font-size: 9.5pt;
    }
    .totals-table tr td:first-child {
      color: var(--muted);
      font-weight: 500;
      text-align: right;
      padding-right: 5mm;
    }
    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 600;
      color: var(--ink);
    }
    .totals-table tr.total-row td {
      font-size: 11pt;
      font-weight: 700;
      padding-top: 3.5mm;
      padding-bottom: 3.5mm;
      border-top: 0.3mm solid var(--border);
    }
    .totals-table tr.paid-row td {
      padding-top: 3mm;
    }
    .totals-table tr.balance-row td {
      border: 0.3mm solid var(--border);
      padding: 3mm 3mm;
      font-weight: 700;
      font-size: 10pt;
    }
    .totals-table tr.balance-row td:first-child {
      color: var(--ink);
    }

    /* ── NOTES ── */
    .notes-section {
      margin-top: auto;
      padding-top: 8mm;
      border-top: 0.2mm solid var(--border);
    }
    .notes-section .notes-label {
      font-size: 8.5pt;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 2mm;
    }
    .notes-section .notes-body {
      font-size: 8pt;
      color: var(--muted);
      line-height: 1.7;
      white-space: pre-wrap;
      font-style: italic;
    }

    /* ── FOOTER ── */
    .footer {
      margin-top: 6mm;
      padding-top: 4mm;
      border-top: 0.2mm solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: var(--light-muted);
    }

    /* ── VOID WATERMARK ── */
    .void-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 60pt;
      font-weight: 800;
      color: rgba(220, 38, 38, 0.07);
      text-transform: uppercase;
      letter-spacing: 8mm;
      pointer-events: none;
      z-index: 10;
    }
  `;
}

export function buildReceiptHtml(viewModel, { fontFaceCss = '' } = {}) {
  const statusClass = viewModel.status === 'VOID' ? 'void' : 'issued';

  const statusLabel = viewModel.status === 'VOID' ? 'Voided' : 'Paid';

  // Build line items from the receipt data
  const tripLabel = viewModel.tripDetails.tripName || viewModel.tripDetails.destination || 'Travel Package';
  const tripSub = viewModel.tripDetails.destination
    ? `${viewModel.tripDetails.destination}${viewModel.tripDetails.travelStartDateLabel ? ` · ${viewModel.tripDetails.travelStartDateLabel}` : ''}${viewModel.tripDetails.travelEndDateLabel ? ` – ${viewModel.tripDetails.travelEndDateLabel}` : ''}`
    : '';

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(viewModel.receiptNumber || 'Receipt')}</title>
        <style>${buildStyles(fontFaceCss)}</style>
      </head>
      <body>
        <div class="document-root">
        <div class="page receipt-shell" data-page-body style="--brand-primary-color: ${escapeHtml(viewModel.agency.primaryColor)};">
          ${viewModel.status === 'VOID' ? '<div class="void-watermark">VOID</div>' : ''}

          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <h1>RECEIPT</h1>
              <span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            </div>
            <div class="header-right">
              <div class="company-name">${escapeHtml(viewModel.agency.companyName)}</div>
              <div class="company-details">
                ${viewModel.agency.companyAddress ? escapeHtml(viewModel.agency.companyAddress) + '<br/>' : ''}
                ${viewModel.agency.companyPhone ? escapeHtml(viewModel.agency.companyPhone) : ''}${viewModel.agency.companyEmail ? '&nbsp;&nbsp;' + escapeHtml(viewModel.agency.companyEmail) : ''}
                ${viewModel.agency.companyGstin ? '<br/>GSTIN: ' + escapeHtml(viewModel.agency.companyGstin) : ''}
              </div>
            </div>
          </div>

          <!-- Bill To + Receipt Info -->
          <div class="bill-section">
            <div class="bill-to">
              <div class="label">Bill To:</div>
              <div class="name">${escapeHtml(viewModel.customer.leadName || 'Customer')}</div>
              <div class="contact">
                ${viewModel.customer.phone ? escapeHtml(viewModel.customer.phone) : ''}
                ${viewModel.customer.email ? '<br/>' + escapeHtml(viewModel.customer.email) : ''}
                ${viewModel.customer.address ? '<br/>' + escapeHtml(viewModel.customer.address) : ''}
              </div>
            </div>
            <div class="receipt-info">
              <div class="info-row"><strong>Receipt #:</strong> ${escapeHtml(viewModel.receiptNumber || 'Will be assigned')}</div>
              <div class="info-row"><strong>Date:</strong> ${escapeHtml(viewModel.payment.paymentDateLabel)}</div>
              <div class="info-row"><strong>Mode:</strong> ${escapeHtml(viewModel.payment.paymentMode)}</div>
              ${viewModel.payment.transactionReference ? `<div class="info-row"><strong>Ref:</strong> ${escapeHtml(viewModel.payment.transactionReference)}</div>` : ''}
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width:50%">Item Description</th>
                <th>Type</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  ${escapeHtml(tripLabel)}
                  ${tripSub ? `<span class="item-sub">${escapeHtml(tripSub)}</span>` : ''}
                </td>
                <td>${escapeHtml(viewModel.display.typeLabel)}</td>
                <td>${escapeHtml(viewModel.totals.packageAmountLabel)}</td>
                <td>${escapeHtml(viewModel.payment.amountLabel)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Totals -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Package Amount:</td>
                <td>${escapeHtml(viewModel.totals.packageAmountLabel)}</td>
              </tr>
              <tr>
                <td>Previous Payments:</td>
                <td>${escapeHtml(viewModel.totals.previousPaymentsLabel)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Received:</strong></td>
                <td>${escapeHtml(viewModel.totals.totalReceivedLabel)}</td>
              </tr>
              <tr class="paid-row">
                <td>Amount Paid:</td>
                <td>${escapeHtml(viewModel.payment.amountLabel)}</td>
              </tr>
              <tr class="balance-row">
                <td>Balance Due:</td>
                <td>${escapeHtml(viewModel.totals.pendingAmountLabel)}</td>
              </tr>
            </table>
          </div>

          <!-- Notes -->
          ${viewModel.notes.publicNote ? `
          <div class="notes-section">
            <div class="notes-label">Notes:</div>
            <div class="notes-body">${escapeHtml(viewModel.notes.publicNote)}</div>
          </div>
          ` : `
          <div class="notes-section">
            <div class="notes-label">Notes:</div>
            <div class="notes-body">Thank you for your payment. We appreciate your trust in ${escapeHtml(viewModel.agency.companyName)}.</div>
          </div>
          `}

          <!-- Footer -->
          <div class="footer">
            <span>${escapeHtml(viewModel.agency.footerNote)}</span>
            <span>${escapeHtml(viewModel.receiptNumber || '')}</span>
          </div>
        </div>
        </div>
      </body>
    </html>
  `;

  return {
    html,
    layoutPlan: {
      pageCount: 1,
      templateVersion: 'FINANCE_RECEIPT_A4_V2',
    },
  };
}
