import ReceiptSetting from '../../models/ReceiptSetting.js';

const DEFAULT_RECEIPT_SETTINGS = [
  { key: 'company_name', value: 'Paradise Yatra', description: 'Primary company name shown on receipts' },
  { key: 'company_address', value: '', description: 'Company address block for receipt header' },
  { key: 'company_phone', value: '', description: 'Finance contact number for receipts' },
  { key: 'company_email', value: '', description: 'Finance contact email for receipts' },
  { key: 'company_website', value: '', description: 'Website shown in receipt header/footer' },
  { key: 'company_gstin', value: '', description: 'Optional GSTIN field for finance receipts' },
  { key: 'receipt_number_prefix', value: 'PY', description: 'Receipt numbering prefix' },
  { key: 'receipt_currency_code', value: 'INR', description: 'Default currency code' },
  { key: 'receipt_locale', value: 'en-IN', description: 'Default locale for dates and currency' },
  { key: 'receipt_timezone', value: 'Asia/Kolkata', description: 'Default timezone for generated documents' },
  { key: 'receipt_footer_note', value: 'This is a system-generated receipt and is valid without signature.', description: 'Footer note printed on exported receipts' },
  { key: 'receipt_logo_url', value: '', description: 'Optional company logo URL for receipts' },
  { key: 'receipt_primary_color', value: '#0f766e', description: 'Primary brand color for receipts' },
  { key: 'receipt_accent_color', value: '#7c2d12', description: 'Accent color for receipt template' },
];

export async function seedDefaultReceiptSettings() {
  await Promise.all(
    DEFAULT_RECEIPT_SETTINGS.map((setting) =>
      ReceiptSetting.updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      )
    )
  );
}

export async function getSettingValue(key, fallback = null) {
  const setting = await ReceiptSetting.findOne({ key }).lean();
  return setting?.value ?? fallback;
}

export async function getStringSettingValue(key, fallback = '') {
  const value = await getSettingValue(key, fallback);
  return value == null ? fallback : String(value);
}

export async function getSettingsMap() {
  await seedDefaultReceiptSettings();
  const settings = await ReceiptSetting.find({}).lean();
  return new Map(settings.map((setting) => [setting.key, setting.value]));
}
