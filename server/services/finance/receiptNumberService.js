import Receipt from '../../models/Receipt.js';
import { getStringSettingValue } from './receiptSettingsService.js';

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildNumber(prefix, year, sequence) {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

async function getNextSequence(prefix, year) {
  const regex = new RegExp(`^${escapeRegex(prefix)}-${year}-\\d{4}$`);
  const latest = await Receipt.findOne({ receiptNumber: { $regex: regex } })
    .sort({ receiptNumber: -1 })
    .select('receiptNumber')
    .lean();

  if (!latest?.receiptNumber) {
    return 1;
  }

  const match = latest.receiptNumber.match(/(\d{4})$/);
  return match ? Number(match[1]) + 1 : 1;
}

export async function generateNextReceiptNumber(dateValue = new Date()) {
  const prefix = await getStringSettingValue('receipt_number_prefix', 'PY');
  const issueDate = new Date(dateValue);
  const year = Number.isNaN(issueDate.getTime()) ? new Date().getFullYear() : issueDate.getFullYear();
  const nextSequence = await getNextSequence(prefix, year);
  return buildNumber(prefix, year, nextSequence);
}

export async function assignReceiptNumber(receipt) {
  const baseDate = receipt?.payment?.paymentDate || new Date();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = await generateNextReceiptNumber(baseDate);
    const updated = await Receipt.findOneAndUpdate(
      {
        _id: receipt._id,
        $or: [{ receiptNumber: null }, { receiptNumber: '' }, { receiptNumber: { $exists: false } }],
      },
      { $set: { receiptNumber: candidate } },
      { new: true }
    );

    if (updated) {
      return updated;
    }

    const fresh = await Receipt.findById(receipt._id).select('receiptNumber').lean();
    if (fresh?.receiptNumber) {
      return fresh;
    }
  }

  throw new Error('FAILED_TO_ASSIGN_RECEIPT_NUMBER');
}
