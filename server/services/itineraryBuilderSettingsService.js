import ItineraryBuilderSetting from '../models/ItineraryBuilderSetting.js';

const DEFAULTS = {
  day_start_time: '09:00',
  default_transition_buffer_min: 10,
  route_cache_ttl_hours: 168,
  logic_timezone: 'Asia/Kolkata',
  osrm_base_url: process.env.OSRM_BASE_URL || 'https://router.project-osrm.org',
  pdf_rendering_enabled: true,
  pdf_currency_code: 'INR',
  pdf_locale: 'en-IN',
  pdf_timezone: 'Asia/Kolkata',
  pdf_default_gst_percent: 5,
  pdf_default_markup_percent: 0,
  pdf_agency_name: 'Paradise Yatra',
  pdf_agency_phone: '',
  pdf_agency_email: '',
  pdf_agency_website: '',
  pdf_terms:
    'Rates are indicative and subject to availability at confirmation time. Standard cancellation policy applies.',
};

export async function getSettingValue(key, fallbackValue = undefined) {
  const setting = await ItineraryBuilderSetting.findOne({ key }).lean();
  if (setting && Object.prototype.hasOwnProperty.call(setting, 'value')) {
    return setting.value;
  }
  if (fallbackValue !== undefined) {
    return fallbackValue;
  }
  return DEFAULTS[key];
}

export async function getNumericSettingValue(key, fallbackValue) {
  const value = await getSettingValue(key, fallbackValue);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number(fallbackValue);
}

export async function getStringSettingValue(key, fallbackValue) {
  const value = await getSettingValue(key, fallbackValue);
  return value == null ? String(fallbackValue ?? '') : String(value);
}

export async function seedDefaultItineraryBuilderSettings(updatedBy = null) {
  const operations = Object.entries(DEFAULTS).map(([key, value]) => ({
    updateOne: {
      filter: { key },
      update: {
        $setOnInsert: {
          key,
          value,
          description: `Default value for ${key}`,
          updatedBy,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length > 0) {
    await ItineraryBuilderSetting.bulkWrite(operations);
  }
}

export { DEFAULTS as ITINERARY_BUILDER_SETTING_DEFAULTS };
