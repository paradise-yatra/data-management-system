import { z } from 'zod';
import ItineraryBuilderSetting from '../models/ItineraryBuilderSetting.js';
import { seedDefaultItineraryBuilderSettings } from '../services/itineraryBuilderSettingsService.js';

const updateSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});

export async function listItineraryBuilderSettings(req, res) {
  try {
    await seedDefaultItineraryBuilderSettings();
    const data = await ItineraryBuilderSetting.find({}).sort({ key: 1 }).lean();
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list itinerary builder settings',
      error: error.message,
    });
  }
}

export async function upsertItineraryBuilderSetting(req, res) {
  try {
    const parsed = updateSettingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload',
        errors: parsed.error.flatten(),
      });
    }

    const key = String(req.params.key || '').trim();
    if (!key) {
      return res.status(400).json({
        success: false,
        message: 'Setting key is required',
      });
    }

    const update = {
      key,
      value: parsed.data.value,
      updatedBy: req.user?._id || req.user?.id || null,
    };
    if (parsed.data.description !== undefined) {
      update.description = parsed.data.description;
    }

    const setting = await ItineraryBuilderSetting.findOneAndUpdate(
      { key },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    return res.json({
      success: true,
      data: setting,
      message: 'Setting saved successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to save itinerary builder setting',
      error: error.message,
    });
  }
}

