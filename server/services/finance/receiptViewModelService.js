import mongoose from 'mongoose';
import PoolLead from '../../models/PoolLead.js';
import Receipt from '../../models/Receipt.js';
import {
  clampNumber,
  formatCurrency,
  formatDateLabel,
  formatDateTimeLabel,
  truncateText,
} from './receiptFormatters.js';
import { getSettingsMap, getStringSettingValue } from './receiptSettingsService.js';

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'];
const RECEIPT_TYPES = ['ADVANCE', 'PARTIAL', 'FULL'];

function normalizeDate(value, fallback = null) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function buildBrandingDefaults(settingsMap) {
  return {
    companyName: String(settingsMap.get('company_name') || 'Paradise Yatra'),
    companyAddress: String(settingsMap.get('company_address') || ''),
    companyPhone: String(settingsMap.get('company_phone') || ''),
    companyEmail: String(settingsMap.get('company_email') || ''),
    companyWebsite: String(settingsMap.get('company_website') || ''),
    companyGstin: String(settingsMap.get('company_gstin') || ''),
    logoUrl: String(settingsMap.get('receipt_logo_url') || ''),
    footerNote: String(
      settingsMap.get('receipt_footer_note') ||
        'This is a system-generated receipt and is valid without signature.'
    ),
    primaryColor: String(settingsMap.get('receipt_primary_color') || '#0f766e'),
    accentColor: String(settingsMap.get('receipt_accent_color') || '#7c2d12'),
    currencyCode: String(settingsMap.get('receipt_currency_code') || 'INR'),
    locale: String(settingsMap.get('receipt_locale') || 'en-IN'),
    timezone: String(settingsMap.get('receipt_timezone') || 'Asia/Kolkata'),
  };
}

function computeReceiptType(inputType, totals) {
  if (RECEIPT_TYPES.includes(inputType)) {
    return inputType;
  }
  if (totals.pendingAmount <= 0) return 'FULL';
  if (totals.previousPayments <= 0) return 'ADVANCE';
  return 'PARTIAL';
}

function mergeBrandingSnapshot(defaults, existingSnapshot = {}, incomingSnapshot = {}) {
  const result = {};
  for (const key of Object.keys(defaults)) {
    const incomingValue = incomingSnapshot[key];
    const existingValue = existingSnapshot[key];
    result[key] =
      incomingValue != null && String(incomingValue).trim() !== ''
        ? incomingValue
        : existingValue != null && String(existingValue).trim() !== ''
          ? existingValue
          : defaults[key];
  }
  return result;
}

function buildWhatsAppSummary(receiptNumber, customerName, tripName, amountLabel, paymentMode, pendingLabel) {
  const numberLabel = receiptNumber || 'Payment Receipt';
  const nameLabel = customerName || 'Customer';
  const tripLabel = tripName || 'Trip';
  const pendingText = pendingLabel ? `Pending balance: ${pendingLabel}.` : '';
  return `${numberLabel}: Payment of ${amountLabel} received from ${nameLabel} for ${tripLabel} via ${paymentMode}. ${pendingText}`.trim();
}

async function resolveLeadSnapshot(linkedLeadId, existingCustomer = {}) {
  if (!mongoose.Types.ObjectId.isValid(linkedLeadId)) {
    return {
      linkedLeadId: null,
      customerSnapshot: existingCustomer,
    };
  }

  const lead = await PoolLead.findById(linkedLeadId).lean();
  if (!lead) {
    const error = new Error('POOL_LEAD_NOT_FOUND');
    error.code = 'POOL_LEAD_NOT_FOUND';
    throw error;
  }

  return {
    linkedLeadId: lead._id,
    customerSnapshot: {
      leadName: lead.leadName || existingCustomer.leadName || '',
      phone: lead.phone || existingCustomer.phone || '',
      email: lead.email || existingCustomer.email || '',
      address: existingCustomer.address || '',
    },
  };
}

export async function normalizeReceiptPayload(payload = {}, existingReceipt = null) {
  const settingsMap = await getSettingsMap();
  const brandingDefaults = buildBrandingDefaults(settingsMap);
  const resolvedLead = await resolveLeadSnapshot(
    payload.linkedLeadId,
    payload.customer || existingReceipt?.customer || {}
  );

  const receivedAmount = clampNumber(payload.payment?.receivedAmount, {
    min: 0,
    max: 999999999,
    fallback: existingReceipt?.payment?.receivedAmount || 0,
  });
  const packageAmount = clampNumber(payload.totals?.packageAmount, {
    min: 0,
    max: 999999999,
    fallback: existingReceipt?.totals?.packageAmount || 0,
  });
  const previousPayments = clampNumber(payload.totals?.previousPayments, {
    min: 0,
    max: 999999999,
    fallback: existingReceipt?.totals?.previousPayments || 0,
  });
  const totalReceived = previousPayments + receivedAmount;
  const pendingAmount = Math.max(0, packageAmount - totalReceived);
  const status = existingReceipt?.status === 'VOID' ? 'VOID' : 'ISSUED';

  return {
    status,
    type: computeReceiptType(payload.type || existingReceipt?.type, {
      previousPayments,
      pendingAmount,
    }),
    linkedLeadId: resolvedLead.linkedLeadId,
    linkedTripId: mongoose.Types.ObjectId.isValid(payload.linkedTripId)
      ? payload.linkedTripId
      : existingReceipt?.linkedTripId || null,
    customer: {
      leadName: truncateText(
        payload.customer?.leadName || resolvedLead.customerSnapshot.leadName || '',
        120
      ),
      phone: truncateText(payload.customer?.phone || resolvedLead.customerSnapshot.phone || '', 40),
      email: truncateText(payload.customer?.email || resolvedLead.customerSnapshot.email || '', 120),
      address: truncateText(
        payload.customer?.address || resolvedLead.customerSnapshot.address || '',
        240
      ),
    },
    tripDetails: {
      tripName: truncateText(
        payload.tripDetails?.tripName || existingReceipt?.tripDetails?.tripName || '',
        120
      ),
      destination: truncateText(
        payload.tripDetails?.destination || existingReceipt?.tripDetails?.destination || '',
        120
      ),
      travelStartDate: normalizeDate(
        payload.tripDetails?.travelStartDate,
        existingReceipt?.tripDetails?.travelStartDate || null
      ),
      travelEndDate: normalizeDate(
        payload.tripDetails?.travelEndDate,
        existingReceipt?.tripDetails?.travelEndDate || null
      ),
    },
    payment: {
      paymentDate:
        normalizeDate(payload.payment?.paymentDate, existingReceipt?.payment?.paymentDate || new Date()) ||
        new Date(),
      paymentMode: PAYMENT_MODES.includes(payload.payment?.paymentMode)
        ? payload.payment.paymentMode
        : existingReceipt?.payment?.paymentMode || 'UPI',
      transactionReference: truncateText(
        payload.payment?.transactionReference ||
          existingReceipt?.payment?.transactionReference ||
          '',
        120
      ),
      receivedAmount,
    },
    totals: {
      packageAmount,
      previousPayments,
      totalReceived,
      pendingAmount,
    },
    notes: {
      publicNote: truncateText(
        payload.notes?.publicNote || existingReceipt?.notes?.publicNote || '',
        500
      ),
      internalNote: truncateText(
        payload.notes?.internalNote || existingReceipt?.notes?.internalNote || '',
        1000
      ),
      voidReason: existingReceipt?.notes?.voidReason || '',
    },
    brandingSnapshot: mergeBrandingSnapshot(
      brandingDefaults,
      existingReceipt?.brandingSnapshot || {},
      payload.brandingSnapshot || {}
    ),
  };
}

export async function buildReceiptViewModel({
  receiptId = null,
  inputReceipt = null,
  generatedBy = null,
} = {}) {
  let sourceReceipt = null;
  if (receiptId) {
    sourceReceipt = await Receipt.findById(receiptId).lean();
    if (!sourceReceipt) {
      const error = new Error('RECEIPT_NOT_FOUND');
      error.code = 'RECEIPT_NOT_FOUND';
      throw error;
    }
  }

  const settingsMap = await getSettingsMap();
  const brandingDefaults = buildBrandingDefaults(settingsMap);
  const normalized = sourceReceipt
    ? await normalizeReceiptPayload(sourceReceipt, sourceReceipt)
    : await normalizeReceiptPayload(inputReceipt || {}, null);

  const effectiveStatus = sourceReceipt?.status === 'VOID' ? 'VOID' : 'ISSUED';
  const effectiveNumber = sourceReceipt?.receiptNumber || null;
  const generatedAt = new Date();
  const locale =
    normalized.brandingSnapshot.locale || (await getStringSettingValue('receipt_locale', 'en-IN'));
  const timezone =
    normalized.brandingSnapshot.timezone ||
    (await getStringSettingValue('receipt_timezone', 'Asia/Kolkata'));
  const currencyCode = normalized.brandingSnapshot.currencyCode || 'INR';
  const amountReceivedLabel = formatCurrency(normalized.payment.receivedAmount, currencyCode, locale);
  const totalReceivedLabel = formatCurrency(normalized.totals.totalReceived, currencyCode, locale);
  const pendingAmountLabel = formatCurrency(normalized.totals.pendingAmount, currencyCode, locale);
  const packageAmountLabel = formatCurrency(normalized.totals.packageAmount, currencyCode, locale);

  return {
    receiptId: sourceReceipt ? String(sourceReceipt._id) : null,
    receiptNumber: effectiveNumber,
    status: effectiveStatus,
    type: sourceReceipt?.type || normalized.type,
    locale,
    timezone,
    currencyCode,
    generatedAt: generatedAt.toISOString(),
    generatedAtLabel: formatDateTimeLabel(generatedAt, { locale, timeZone: timezone }),
    generatedBy: generatedBy ? String(generatedBy) : null,
    customer: normalized.customer,
    tripDetails: {
      ...normalized.tripDetails,
      travelStartDateLabel: normalized.tripDetails.travelStartDate
        ? formatDateLabel(normalized.tripDetails.travelStartDate, { locale, timeZone: timezone })
        : '',
      travelEndDateLabel: normalized.tripDetails.travelEndDate
        ? formatDateLabel(normalized.tripDetails.travelEndDate, { locale, timeZone: timezone })
        : '',
    },
    payment: {
      ...normalized.payment,
      paymentDateLabel: formatDateLabel(normalized.payment.paymentDate, {
        locale,
        timeZone: timezone,
      }),
      amountLabel: amountReceivedLabel,
    },
    totals: {
      ...normalized.totals,
      packageAmountLabel,
      previousPaymentsLabel: formatCurrency(normalized.totals.previousPayments, currencyCode, locale),
      totalReceivedLabel,
      pendingAmountLabel,
    },
    notes: normalized.notes,
    agency: {
      ...brandingDefaults,
      ...normalized.brandingSnapshot,
    },
    whatsAppSummary: buildWhatsAppSummary(
      effectiveNumber,
      normalized.customer.leadName,
      normalized.tripDetails.tripName || normalized.tripDetails.destination,
      amountReceivedLabel,
      normalized.payment.paymentMode,
      normalized.totals.pendingAmount > 0 ? pendingAmountLabel : ''
    ),
    metadata: {
      source: sourceReceipt ? 'RECEIPT_RECORD' : 'INPUT_PAYLOAD',
      templateVersion: 'FINANCE_RECEIPT_A4_V1',
      renderMode: 'LOCKED_A4_PUPPETEER',
      generatedTimestamp: generatedAt.getTime(),
    },
    display: {
      statusLabel: effectiveStatus === 'VOID' ? 'Voided' : 'Issued',
      typeLabel:
        normalized.type === 'FULL'
          ? 'Full Payment'
          : normalized.type === 'PARTIAL'
            ? 'Partial Payment'
            : 'Advance Payment',
      amountInWordsHint: `${amountReceivedLabel} received`,
    },
  };
}
