import ReceiptSetting from '../models/ReceiptSetting.js';
import { seedDefaultReceiptSettings } from '../services/finance/receiptSettingsService.js';

export async function listReceiptSettings(req, res) {
  try {
    await seedDefaultReceiptSettings();
    const settings = await ReceiptSetting.find({}).sort({ key: 1 }).lean();
    return res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load receipt settings',
      error: error.message,
    });
  }
}

export async function upsertReceiptSetting(req, res) {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Setting key is required',
      });
    }

    const value = Object.prototype.hasOwnProperty.call(req.body || {}, 'value') ? req.body.value : null;
    const description =
      Object.prototype.hasOwnProperty.call(req.body || {}, 'description') && req.body.description != null
        ? String(req.body.description)
        : '';

    const setting = await ReceiptSetting.findOneAndUpdate(
      { key },
      {
        $set: {
          value,
          description,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.json({
      success: true,
      data: setting,
      message: 'Receipt setting saved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save receipt setting',
      error: error.message,
    });
  }
}
