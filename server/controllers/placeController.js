import { z } from 'zod';
import Place from '../models/Place.js';

const CATEGORIES = ['SIGHTSEEING', 'FOOD', 'ADVENTURE', 'RELAXATION', 'SHOPPING'];
const WEEK_DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const placeCreateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  category: z.enum(CATEGORIES),
  location: z.object({
    type: z.literal('Point').optional().default('Point'),
    coordinates: z.tuple([z.number(), z.number()]),
  }),
  avgDurationMin: z.number().int().positive(),
  opensAt: z.string().regex(TIME_PATTERN),
  closesAt: z.string().regex(TIME_PATTERN),
  closedDays: z.array(z.enum(WEEK_DAYS)).optional().default([]),
  priceForeigner: z.number().min(0).optional().default(0),
  priceDomestic: z.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const placeUpdateSchema = placeCreateSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be updated',
});

const listQuerySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  search: z.string().trim().optional(),
  isActive: z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return undefined;
    }),
  near: z.string().optional(),
  radiusKm: z
    .string()
    .optional()
    .transform((value) => (value == null ? 20 : Number(value))),
  page: z
    .string()
    .optional()
    .transform((value) => (value == null ? 1 : Number(value))),
  limit: z
    .string()
    .optional()
    .transform((value) => (value == null ? 50 : Number(value))),
});

function parseNearQuery(nearValue) {
  if (!nearValue) return null;
  const [lonRaw, latRaw] = String(nearValue).split(',');
  const lon = Number(lonRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new Error('INVALID_NEAR_COORDINATES');
  }
  return [lon, lat];
}

export async function listPlaces(req, res) {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: parsed.error.flatten(),
      });
    }

    const { category, search, isActive, near, radiusKm, page, limit } = parsed.data;
    const query = {};

    if (category) query.category = category;
    if (typeof isActive === 'boolean') query.isActive = isActive;
    if (search) query.name = { $regex: search, $options: 'i' };

    const nearCoordinates = parseNearQuery(near);
    if (nearCoordinates) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: nearCoordinates,
          },
          $maxDistance: Math.max(1, Number(radiusKm) || 20) * 1000,
        },
      };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      Place.find(query).sort({ updatedAt: -1 }).skip(skip).limit(safeLimit).lean(),
      Place.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
      },
    });
  } catch (error) {
    if (error.message === 'INVALID_NEAR_COORDINATES') {
      return res.status(400).json({
        success: false,
        message: 'near must be in format: longitude,latitude',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list places',
      error: error.message,
    });
  }
}

export async function getPlace(req, res) {
  try {
    const place = await Place.findById(req.params.id).lean();
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found',
      });
    }

    return res.json({
      success: true,
      data: place,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch place',
      error: error.message,
    });
  }
}

export async function createPlace(req, res) {
  try {
    const parsed = placeCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid place payload',
        errors: parsed.error.flatten(),
      });
    }

    const payload = parsed.data;
    const place = await Place.create({
      ...payload,
      location: {
        type: 'Point',
        coordinates: payload.location.coordinates,
      },
      createdBy: req.user?._id || req.user?.id || null,
      updatedBy: req.user?._id || req.user?.id || null,
    });

    return res.status(201).json({
      success: true,
      data: place,
      message: 'Place created successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create place',
      error: error.message,
    });
  }
}

export async function updatePlace(req, res) {
  try {
    const parsed = placeUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid place payload',
        errors: parsed.error.flatten(),
      });
    }

    const update = {
      ...parsed.data,
      updatedBy: req.user?._id || req.user?.id || null,
    };

    if (update.location?.coordinates) {
      update.location = {
        type: 'Point',
        coordinates: update.location.coordinates,
      };
    }

    const place = await Place.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found',
      });
    }

    return res.json({
      success: true,
      data: place,
      message: 'Place updated successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update place',
      error: error.message,
    });
  }
}

export async function deletePlace(req, res) {
  try {
    const place = await Place.findByIdAndDelete(req.params.id);
    if (!place) {
      return res.status(404).json({
        success: false,
        message: 'Place not found',
      });
    }

    return res.json({
      success: true,
      message: 'Place deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete place',
      error: error.message,
    });
  }
}

