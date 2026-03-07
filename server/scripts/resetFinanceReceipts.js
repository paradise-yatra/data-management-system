import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import Receipt from '../models/Receipt.js';
import ReceiptDocument from '../models/ReceiptDocument.js';

dotenv.config();

const receiptStoragePath = path.join(process.cwd(), 'server', 'storage', 'receipt-documents');

async function resetFinanceReceipts() {
  try {
    const [receiptResult, documentResult] = await Promise.all([
      Receipt.deleteMany({}),
      ReceiptDocument.deleteMany({}),
    ]);

    await fs.rm(receiptStoragePath, { recursive: true, force: true });

    console.log(`Deleted ${receiptResult.deletedCount || 0} receipts.`);
    console.log(`Deleted ${documentResult.deletedCount || 0} receipt documents.`);
    console.log('Deleted receipt export files.');
  } catch (error) {
    console.error('Failed to reset finance receipts:', error);
    process.exitCode = 1;
  } finally {
    if (Receipt.db) {
      await Receipt.db.close();
    }
  }
}

await resetFinanceReceipts();
