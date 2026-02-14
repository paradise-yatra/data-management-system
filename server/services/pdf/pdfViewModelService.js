import mongoose from 'mongoose';
import Trip from '../../models/Trip.js';
import Place from '../../models/Place.js';
import {
  getSettingValue,
  getStringSettingValue,
  getNumericSettingValue,
} from '../itineraryBuilderSettingsService.js';
import {
  clampNumber,
  ensureArray,
  formatCurrency,
  formatDateLabel,
  formatDateTimeLabel,
  formatDurationMinutes,
  toSafeString,
  truncateText,
} from './pdfFormatters.js';

const DEFAULT_TRAVELER = {
  leadName: '',
  adults: 2,
  children: 0,
  infants: 0,
  nationality: 'DOMESTIC',
  contactPhone: '',
  contactEmail: '',
};

function normalizeTraveler(input = {}) {
  return {
    leadName: truncateText(input.leadName, 120),
    adults: clampNumber(input.adults, { min: 0, max: 40, fallback: DEFAULT_TRAVELER.adults }),
    children: clampNumber(input.children, { min: 0, max: 40, fallback: DEFAULT_TRAVELER.children }),
    infants: clampNumber(input.infants, { min: 0, max: 20, fallback: DEFAULT_TRAVELER.infants }),
    nationality:
      String(input.nationality || DEFAULT_TRAVELER.nationality).toUpperCase() === 'FOREIGNER'
        ? 'FOREIGNER'
        : 'DOMESTIC',
    contactPhone: truncateText(input.contactPhone, 32),
    contactEmail: truncateText(input.contactEmail, 120),
  };
}

function normalizePricingInput(input = {}, defaults = {}) {
  return {
    markupPercent: clampNumber(input.markupPercent, {
      min: 0,
      max: 300,
      fallback: Number(defaults.markupPercent) || 0,
    }),
    gstPercent: clampNumber(input.gstPercent, {
      min: 0,
      max: 50,
      fallback: Number(defaults.gstPercent) || 0,
    }),
    discountAmount: clampNumber(input.discountAmount, { min: 0, max: 99999999, fallback: 0 }),
  };
}

function normalizeDraftDay(day, dayIndex) {
  const normalizedIndex = Number.isInteger(day?.dayIndex) ? day.dayIndex : dayIndex;
  const events = ensureArray(day?.events)
    .map((event, eventIndex) => {
      if (!mongoose.Types.ObjectId.isValid(event?.placeId)) {
        return null;
      }
      return {
        placeId: String(event.placeId),
        order: Number.isInteger(event?.order) ? event.order : eventIndex,
        startTime: toSafeString(event?.startTime) || null,
        endTime: toSafeString(event?.endTime) || null,
        travelTimeMin: clampNumber(event?.travelTimeMin, { min: 0, max: 10000, fallback: 0 }),
        distanceKm: clampNumber(event?.distanceKm, { min: 0, max: 100000, fallback: 0 }),
        validationStatus: event?.validationStatus === 'INVALID' ? 'INVALID' : 'VALID',
        validationReason: toSafeString(event?.validationReason) || null,
        routeProvider: ['OSRM', 'HAVERSINE', 'STATIC'].includes(String(event?.routeProvider))
          ? String(event.routeProvider)
          : 'STATIC',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((event, index) => ({ ...event, order: index }));

  return {
    dayIndex: normalizedIndex,
    date: day?.date ? new Date(day.date) : new Date(),
    events,
  };
}

function extractPlaceImageUrl(place) {
  if (!place || typeof place !== 'object') return null;
  const directCandidates = ['imageUrl', 'image', 'coverImage', 'heroImage', 'thumbnailUrl'];
  for (const key of directCandidates) {
    const value = place[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  if (Array.isArray(place.images)) {
    const first = place.images.find((value) => typeof value === 'string' && value.trim());
    if (first) return first.trim();
  }

  if (Array.isArray(place.gallery)) {
    const firstGallery = place.gallery.find(
      (entry) => typeof entry === 'string' && entry.trim()
    );
    if (firstGallery) return firstGallery.trim();
  }

  return null;
}

function splitNotes(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => truncateText(item, 200))
      .filter(Boolean)
      .slice(0, 20);
  }

  const text = truncateText(value, 1200);
  if (!text) return [];
  return text
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeDays(days = []) {
  return ensureArray(days)
    .map((day, index) => normalizeDraftDay(day, index))
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

function buildPricingSection({
  daySections,
  traveler,
  pricingInput,
  currencyCode,
  locale,
}) {
  const unitPriceTotal = daySections.reduce((sum, day) => {
    return (
      sum +
      day.events.reduce((daySum, event) => {
        const unitPrice =
          traveler.nationality === 'FOREIGNER'
            ? clampNumber(event.prices?.foreigner, { min: 0, fallback: 0 })
            : clampNumber(event.prices?.domestic, { min: 0, fallback: 0 });
        return daySum + unitPrice;
      }, 0)
    );
  }, 0);

  const adultsAmount = unitPriceTotal * traveler.adults;
  const childrenAmount = unitPriceTotal * traveler.children * 0.6;
  const infantsAmount = unitPriceTotal * traveler.infants * 0.2;
  const baseAmount = adultsAmount + childrenAmount + infantsAmount;

  const markupAmount = Math.round((baseAmount * pricingInput.markupPercent) / 100);
  const discountedSubTotal = Math.max(0, baseAmount + markupAmount - pricingInput.discountAmount);
  const gstAmount = Math.round((discountedSubTotal * pricingInput.gstPercent) / 100);
  const totalAmount = Math.max(0, Math.round(discountedSubTotal + gstAmount));

  return {
    currencyCode,
    lineItems: [
      {
        label: `Adults x ${traveler.adults}`,
        amount: Math.round(adultsAmount),
      },
      {
        label: `Children x ${traveler.children}`,
        amount: Math.round(childrenAmount),
      },
      {
        label: `Infants x ${traveler.infants}`,
        amount: Math.round(infantsAmount),
      },
      {
        label: `Markup (${pricingInput.markupPercent}%)`,
        amount: Math.round(markupAmount),
      },
      {
        label: 'Discount',
        amount: -Math.round(pricingInput.discountAmount),
      },
      {
        label: `GST (${pricingInput.gstPercent}%)`,
        amount: Math.round(gstAmount),
      },
    ],
    summary: {
      baseAmount: Math.round(baseAmount),
      markupPercent: pricingInput.markupPercent,
      markupAmount: Math.round(markupAmount),
      discountAmount: Math.round(pricingInput.discountAmount),
      gstPercent: pricingInput.gstPercent,
      gstAmount: Math.round(gstAmount),
      totalAmount,
      totalFormatted: formatCurrency(totalAmount, currencyCode, locale),
    },
  };
}

function toPlainTripDays(trip, draftDays) {
  if (Array.isArray(draftDays) && draftDays.length > 0) {
    return normalizeDays(draftDays);
  }
  return normalizeDays(trip?.days || []);
}

export async function buildItineraryPdfViewModel({
  tripId,
  draftDays,
  renderRequest = {},
  generatedBy = null,
}) {
  const trip = await Trip.findById(tripId).lean();
  if (!trip) {
    const error = new Error('TRIP_NOT_FOUND');
    error.code = 'TRIP_NOT_FOUND';
    throw error;
  }

  const isPdfEnabled = await getSettingValue('pdf_rendering_enabled', true);
  if (isPdfEnabled === false || String(isPdfEnabled).toLowerCase() === 'false') {
    const error = new Error('PDF_RENDERING_DISABLED');
    error.code = 'PDF_RENDERING_DISABLED';
    throw error;
  }

  const locale = await getStringSettingValue('pdf_locale', 'en-IN');
  const timezone = await getStringSettingValue('pdf_timezone', 'Asia/Kolkata');
  const currencyCode = await getStringSettingValue('pdf_currency_code', 'INR');
  const agencyName = await getStringSettingValue('pdf_agency_name', 'Paradise Yatra');
  const agencyPhone = await getStringSettingValue('pdf_agency_phone', '');
  const agencyEmail = await getStringSettingValue('pdf_agency_email', '');
  const agencyWebsite = await getStringSettingValue('pdf_agency_website', '');
  const agencyTerms = await getSettingValue(
    'pdf_terms',
    'Rates are indicative and subject to availability at confirmation time. Standard cancellation policy applies.'
  );
  const defaultMarkupPercent = await getNumericSettingValue('pdf_default_markup_percent', 0);
  const defaultGstPercent = await getNumericSettingValue('pdf_default_gst_percent', 5);

  const normalizedTraveler = normalizeTraveler(renderRequest?.traveler || {});
  const pricingInput = normalizePricingInput(renderRequest?.pricing || {}, {
    markupPercent: defaultMarkupPercent,
    gstPercent: defaultGstPercent,
  });

  const rawDays = toPlainTripDays(trip, draftDays);
  const placeIds = [
    ...new Set(
      rawDays
        .flatMap((day) => day.events || [])
        .map((event) => event.placeId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const places = await Place.find({ _id: { $in: placeIds } }).lean();
  const placesById = new Map(places.map((place) => [String(place._id), place]));

  const daySections = rawDays.map((day, index) => {
    const dateLabel = formatDateLabel(day.date, { locale, timeZone: timezone });
    const events = (day.events || []).map((event, eventIndex) => {
      const place = placesById.get(String(event.placeId));
      const durationMin = clampNumber(place?.avgDurationMin, { min: 0, max: 1440, fallback: 0 });
      const description = truncateText(place?.description, 250);
      const imageUrl = extractPlaceImageUrl(place);

      return {
        eventIndex,
        order: eventIndex + 1,
        placeId: String(event.placeId),
        placeName: truncateText(place?.name || 'Unknown Place', 140),
        category: toSafeString(place?.category || 'SIGHTSEEING'),
        description,
        imageUrl,
        startTime: toSafeString(event.startTime) || '--:--',
        endTime: toSafeString(event.endTime) || '--:--',
        durationMin,
        travelTimeMin: clampNumber(event.travelTimeMin, { min: 0, max: 5000, fallback: 0 }),
        distanceKm: clampNumber(event.distanceKm, { min: 0, max: 100000, fallback: 0 }),
        routeProvider: toSafeString(event.routeProvider || 'STATIC'),
        validationStatus: event.validationStatus === 'INVALID' ? 'INVALID' : 'VALID',
        validationReason: toSafeString(event.validationReason) || null,
        prices: {
          domestic: clampNumber(place?.priceDomestic, { min: 0, max: 99999999, fallback: 0 }),
          foreigner: clampNumber(place?.priceForeigner, { min: 0, max: 99999999, fallback: 0 }),
        },
      };
    });

    const dayDistanceKm = events.reduce((sum, event) => sum + event.distanceKm, 0);
    const dayTravelTimeMin = events.reduce((sum, event) => sum + event.travelTimeMin, 0);
    const dayVisitDurationMin = events.reduce((sum, event) => sum + event.durationMin, 0);

    return {
      dayIndex: day.dayIndex ?? index,
      dayNumber: index + 1,
      date: day.date,
      dateLabel,
      title: `Day ${index + 1} - ${dateLabel}`,
      events,
      summary: {
        eventCount: events.length,
        dayDistanceKm: Number(dayDistanceKm.toFixed(2)),
        dayTravelTimeMin,
        dayVisitDurationMin,
        dayTravelLabel: formatDurationMinutes(dayTravelTimeMin),
      },
    };
  });

  const totalDistanceKm = daySections.reduce((sum, day) => sum + day.summary.dayDistanceKm, 0);
  const totalTravelTimeMin = daySections.reduce((sum, day) => sum + day.summary.dayTravelTimeMin, 0);
  const totalVisitDurationMin = daySections.reduce(
    (sum, day) => sum + day.summary.dayVisitDurationMin,
    0
  );
  const totalEvents = daySections.reduce((sum, day) => sum + day.summary.eventCount, 0);

  const notes = splitNotes(renderRequest?.notes);
  const fallbackNotes = splitNotes(
    `Schedule is subject to traffic and operational constraints.\nCarry valid IDs and booking vouchers for all entries.`
  );

  const pricing = buildPricingSection({
    daySections,
    traveler: normalizedTraveler,
    pricingInput,
    currencyCode,
    locale,
  });

  const generatedAt = new Date();
  const viewModel = {
    tripId: String(trip._id),
    tripName: truncateText(trip.name || 'Untitled Logic Trip', 120),
    status: trip.status || 'DRAFT',
    locale,
    timezone,
    currencyCode,
    generatedAt: generatedAt.toISOString(),
    generatedAtLabel: formatDateTimeLabel(generatedAt, { locale, timeZone: timezone }),
    generatedBy: generatedBy ? String(generatedBy) : null,
    tripPeriod: {
      startDate: trip.startDate,
      endDate: trip.endDate,
      startDateLabel: formatDateLabel(trip.startDate, { locale, timeZone: timezone }),
      endDateLabel: formatDateLabel(trip.endDate, { locale, timeZone: timezone }),
      totalDays: daySections.length,
    },
    traveler: normalizedTraveler,
    summary: {
      totalDays: daySections.length,
      totalEvents,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      totalTravelTimeMin,
      totalVisitDurationMin,
      totalDistanceLabel: `${Number(totalDistanceKm.toFixed(1))} km`,
      totalTravelLabel: formatDurationMinutes(totalTravelTimeMin),
      totalVisitLabel: formatDurationMinutes(totalVisitDurationMin),
    },
    daySections,
    pricing,
    inclusions: [
      'All sightseeing as per itinerary timeline.',
      'Deterministic routing and operating-hour validation.',
      'Route time and distance calculations with fallback routing.',
    ],
    exclusions: [
      'Personal expenses, tips, and optional activities.',
      'Any increase due to taxes or policy changes post confirmation.',
      'Travel insurance unless explicitly included.',
    ],
    notes: notes.length > 0 ? notes : fallbackNotes,
    terms: splitNotes(agencyTerms),
    agency: {
      name: truncateText(agencyName, 120),
      phone: truncateText(agencyPhone, 60),
      email: truncateText(agencyEmail, 120),
      website: truncateText(agencyWebsite, 120),
    },
    metadata: {
      source: Array.isArray(draftDays) && draftDays.length > 0 ? 'DRAFT_DAYS' : 'TRIP_DAYS',
      templateVersion: 'A4_BROCHURE_V1',
      renderMode: 'LOCKED_A4_PUPPETEER',
      generatedTimestamp: generatedAt.getTime(),
    },
  };

  return viewModel;
}
